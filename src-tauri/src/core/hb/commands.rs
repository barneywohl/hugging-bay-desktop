//! The Hugging Bay native command handlers.
//!
//! Each handler returns the renderer's `{ ok, value } | { ok, error }` envelope
//! (never a Tauri `Err`, which the client would read as a transport fault), and
//! emits the mirror events on the REAL underlying signal only. See `mod.rs` for
//! the honesty contract these uphold.

use super::{
    core_err, err, file_path, free_bytes, models_dir, ok, resolve_url, sanitize, state as st, Area,
    TaskRec, ENGINE_LOCK, LOADED, REGISTRY,
};
use futures_util::StreamExt;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, Runtime};
use tokio::io::AsyncWriteExt;
use tokio_util::sync::CancellationToken;

fn partial_of(final_path: &PathBuf) -> PathBuf {
    PathBuf::from(format!("{}.part", final_path.to_string_lossy()))
}

// ===================== DOWNLOADS =====================

/// The ONE download entry point (§3.3). Resolves the file URL, registers the
/// task, and spawns the real transfer. Fails closed (never fabricates a task
/// id) when the source is unresolvable.
#[tauri::command]
pub async fn hb_downloads_arm<R: Runtime>(
    app: tauri::AppHandle<R>,
    model_id: String,
    file_id: String,
    source: String,
) -> Value {
    let Some(url) = resolve_url(&source, &model_id, &file_id) else {
        return err(Area::Download, "core", "SOURCE_UNRESOLVED");
    };
    let task_id = uuid::Uuid::new_v4().to_string();
    let save_path = file_path(&app, &model_id, &file_id);
    let cancel = CancellationToken::new();
    {
        let mut reg = REGISTRY.lock().unwrap();
        reg.file_to_task.insert(file_id.clone(), task_id.clone());
        reg.tasks.insert(
            task_id.clone(),
            TaskRec {
                model_id: model_id.clone(),
                file_id: file_id.clone(),
                source: source.clone(),
                url,
                save_path,
                cancel,
                paused: false,
                last_state: st::QUEUED.to_string(),
            },
        );
    }
    let _ = app.emit(
        "download/requested",
        json!({ "modelId": model_id, "fileId": file_id, "source": source, "taskId": task_id }),
    );
    spawn_download(app, task_id.clone(), false);
    ok(json!({ "taskId": task_id }))
}

/// The receipt-driven start (§2.2). Registers a task from a full `taskReceipt`
/// (which carries the URL and any `expectedFingerprint`) and begins the
/// transfer. Used when main pre-builds a receipt; `arm` is the common path.
#[tauri::command]
pub async fn hb_downloads_start<R: Runtime>(app: tauri::AppHandle<R>, task: Value) -> Value {
    let model_id = task.get("modelId").and_then(Value::as_str).unwrap_or_default().to_string();
    let file_id = task.get("fileId").and_then(Value::as_str).unwrap_or_default().to_string();
    let source = task.get("source").and_then(Value::as_str).unwrap_or("huggingface").to_string();
    let url = task.get("url").and_then(Value::as_str).map(str::to_string);
    let task_id = task
        .get("taskId")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    if model_id.is_empty() || file_id.is_empty() {
        return err(Area::Download, "invalid-payload", "INVALID_PAYLOAD");
    }
    let Some(url) = url.or_else(|| resolve_url(&source, &model_id, &file_id)) else {
        return err(Area::Download, "core", "SOURCE_UNRESOLVED");
    };
    let save_path = file_path(&app, &model_id, &file_id);
    {
        let mut reg = REGISTRY.lock().unwrap();
        reg.file_to_task.insert(file_id.clone(), task_id.clone());
        reg.tasks.insert(
            task_id.clone(),
            TaskRec {
                model_id,
                file_id,
                source,
                url,
                save_path,
                cancel: CancellationToken::new(),
                paused: false,
                last_state: st::QUEUED.to_string(),
            },
        );
    }
    spawn_download(app, task_id.clone(), false);
    ok(json!({ "taskId": task_id }))
}

#[tauri::command]
pub async fn hb_downloads_pause<R: Runtime>(_app: tauri::AppHandle<R>, task_id: String) -> Value {
    let mut reg = REGISTRY.lock().unwrap();
    match reg.tasks.get_mut(&task_id) {
        Some(t) => {
            t.paused = true;
            t.cancel.cancel();
            ok(json!({}))
        }
        None => err(Area::Download, "core", "NO_TASK"),
    }
}

#[tauri::command]
pub async fn hb_downloads_resume<R: Runtime>(app: tauri::AppHandle<R>, task_id: String) -> Value {
    let from = {
        let mut reg = REGISTRY.lock().unwrap();
        let Some(t) = reg.tasks.get_mut(&task_id) else {
            return err(Area::Download, "core", "NO_TASK");
        };
        t.paused = false;
        t.cancel = CancellationToken::new();
        t.last_state.clone()
    };
    let _ = app.emit("download/resumed", json!({ "taskId": task_id, "fromState": from }));
    spawn_download(app, task_id.clone(), true);
    ok(json!({}))
}

#[tauri::command]
pub async fn hb_downloads_cancel<R: Runtime>(_app: tauri::AppHandle<R>, task_id: String) -> Value {
    let mut reg = REGISTRY.lock().unwrap();
    match reg.tasks.get_mut(&task_id) {
        Some(t) => {
            t.paused = false;
            t.cancel.cancel();
            ok(json!({}))
        }
        None => err(Area::Download, "core", "NO_TASK"),
    }
}

#[tauri::command]
pub async fn hb_downloads_retry<R: Runtime>(app: tauri::AppHandle<R>, task_id: String) -> Value {
    hb_downloads_resume(app, task_id).await
}

fn emit_state<R: Runtime>(app: &tauri::AppHandle<R>, task_id: &str, to: &str) {
    let from = {
        let mut reg = REGISTRY.lock().unwrap();
        match reg.tasks.get_mut(task_id) {
            Some(t) => {
                let f = t.last_state.clone();
                t.last_state = to.to_string();
                f
            }
            None => "S0".to_string(),
        }
    };
    let _ = app.emit("download/state", json!({ "taskId": task_id, "from": from, "to": to }));
}

/// Spawns the resumable transfer. All milestone events (`download/*`) come from
/// the real bytes moving; nothing is emitted speculatively.
fn spawn_download<R: Runtime>(app: tauri::AppHandle<R>, task_id: String, resume: bool) {
    tauri::async_runtime::spawn(async move {
        run_download(app, task_id, resume).await;
    });
}

async fn run_download<R: Runtime>(app: tauri::AppHandle<R>, task_id: String, resume: bool) {
    // Snapshot the immutable bits; never hold the std Mutex across an await.
    let (url, save_path, cancel, model_id, file_id) = {
        let reg = REGISTRY.lock().unwrap();
        let Some(t) = reg.tasks.get(&task_id) else { return };
        (
            t.url.clone(),
            t.save_path.clone(),
            t.cancel.clone(),
            t.model_id.clone(),
            t.file_id.clone(),
        )
    };
    let partial = partial_of(&save_path);
    if let Some(parent) = save_path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    emit_state(&app, &task_id, st::CONNECTING);

    let mut offset: u64 = 0;
    if resume {
        if let Ok(meta) = tokio::fs::metadata(&partial).await {
            offset = meta.len();
        }
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(0)) // no whole-request timeout on a large GGUF
        .build()
        .unwrap_or_default();
    let mut req = client.get(&url);
    if offset > 0 {
        req = req.header(reqwest::header::RANGE, format!("bytes={offset}-"));
    }
    let resp = match req.send().await {
        Ok(r) => r,
        Err(_) => {
            let _ = app.emit(
                "download/failed",
                json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }),
            );
            return;
        }
    };
    if !resp.status().is_success() {
        let _ = app.emit(
            "download/failed",
            json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }),
        );
        return;
    }
    // A 200 to a ranged request means the server ignored Range: restart clean.
    let ranged = resp.status().as_u16() == 206;
    if offset > 0 && !ranged {
        offset = 0;
    }
    let content_len = resp.content_length().unwrap_or(0);
    let total = if offset > 0 { offset + content_len } else { content_len };

    let mut file = match tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(offset == 0)
        .append(offset > 0)
        .open(&partial)
        .await
    {
        Ok(f) => f,
        Err(_) => {
            let _ = app.emit(
                "download/failed",
                json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }),
            );
            return;
        }
    };

    emit_state(&app, &task_id, st::DOWNLOADING);
    let mut received = offset;
    let mut stream = resp.bytes_stream();
    let mut last_emit = Instant::now();
    let mut last_bytes = received;
    let mut earned_sent = false;

    loop {
        tokio::select! {
            _ = cancel.cancelled() => {
                let _ = file.flush().await;
                let paused = REGISTRY.lock().unwrap().tasks.get(&task_id).map(|t| t.paused).unwrap_or(false);
                if paused {
                    let _ = app.emit("download/checkpoint", json!({ "taskId": task_id, "bytesReceived": received }));
                    emit_state(&app, &task_id, st::PAUSED);
                } else {
                    drop(file);
                    let _ = tokio::fs::remove_file(&partial).await;
                    let _ = tokio::fs::remove_file(&save_path).await;
                    emit_state(&app, &task_id, st::CANCELED);
                }
                return;
            }
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        if file.write_all(&bytes).await.is_err() {
                            let _ = app.emit("download/failed", json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }));
                            return;
                        }
                        received += bytes.len() as u64;
                        if last_emit.elapsed() >= Duration::from_millis(200) {
                            let elapsed = last_emit.elapsed().as_secs_f64().max(0.001);
                            let speed = ((received - last_bytes) as f64 / elapsed).max(0.0);
                            let _ = app.emit("download/progress", json!({
                                "taskId": task_id, "bytesReceived": received, "totalBytes": total, "speedBps": speed
                            }));
                            if !earned_sent && speed > 0.0 && total > 0 {
                                // eta becomes "earned" only once a real speed and a
                                // real total both exist (§3.6). Never a silent guess.
                                let _ = app.emit("download/etawatch", json!({ "taskId": task_id, "verdict": "earned" }));
                                earned_sent = true;
                            }
                            last_emit = Instant::now();
                            last_bytes = received;
                        }
                    }
                    Some(Err(_)) => {
                        let _ = file.flush().await;
                        let _ = app.emit("download/checkpoint", json!({ "taskId": task_id, "bytesReceived": received }));
                        let _ = app.emit("download/failed", json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }));
                        return;
                    }
                    None => break, // stream complete
                }
            }
        }
    }

    if file.flush().await.is_err() || tokio::fs::rename(&partial, &save_path).await.is_err() {
        let _ = app.emit(
            "download/failed",
            json!({ "taskId": task_id, "error": { "code": "HB-DOWNLOAD-CORE", "kind": "core" } }),
        );
        return;
    }
    let _ = app.emit(
        "download/progress",
        json!({ "taskId": task_id, "bytesReceived": received, "totalBytes": total, "speedBps": 0.0 }),
    );
    let _ = app.emit(
        "download/completed",
        json!({ "taskId": task_id, "modelId": model_id, "fileId": file_id }),
    );
    // The rail hands off to verification (S14 Checking). The S17 "verified"
    // transition is emitted ONLY by the verifier on a real SHA match.
    emit_state(&app, &task_id, st::VERIFYING);
}

// ===================== VERIFY (SHA-256) =====================

/// Starts a real streaming SHA-256 of the file's bytes. `check/result` reports
/// `matched` ONLY when an expected fingerprint is known AND equal to the
/// computed digest (§4.3); with no reference to compare against, verification
/// cannot reach a verdict and reports `failed` rather than claiming a match.
#[tauri::command]
pub async fn hb_verify_start<R: Runtime>(app: tauri::AppHandle<R>, file_id: String) -> Value {
    let resolved = {
        let reg = REGISTRY.lock().unwrap();
        reg.file_to_task.get(&file_id).and_then(|tid| {
            reg.tasks.get(tid).map(|t| (tid.clone(), t.save_path.clone(), t.model_id.clone()))
        })
    };
    let Some((task_id, path, _model_id)) = resolved else {
        return err(Area::Check, "core", "NO_FILE");
    };
    // No persisted expected fingerprint in the arm-only subset; verification
    // hashes for real but has no reference (see report).
    let expected: Option<String> = None;
    let check_id = uuid::Uuid::new_v4().to_string();
    tauri::async_runtime::spawn(async move {
        run_verify(app, task_id, file_id, path, expected).await;
    });
    ok(json!({ "checkId": check_id }))
}

#[tauri::command]
pub async fn hb_verify_recheck<R: Runtime>(app: tauri::AppHandle<R>, file_id: String) -> Value {
    hb_verify_start(app, file_id).await
}

/// No cached verdicts are kept (§4.3): status reports null rather than a stale
/// claim. A CHECKED verdict lives only in the live `check/result` event.
#[tauri::command]
pub async fn hb_verify_status<R: Runtime>(_app: tauri::AppHandle<R>, _file_id: String) -> Value {
    ok(json!({ "verdict": Value::Null, "checkedAt": Value::Null }))
}

async fn run_verify<R: Runtime>(
    app: tauri::AppHandle<R>,
    task_id: String,
    file_id: String,
    path: PathBuf,
    expected: Option<String>,
) {
    use sha2::{Digest, Sha256};
    let total = tokio::fs::metadata(&path).await.map(|m| m.len()).unwrap_or(0);
    let mut file = match tokio::fs::File::open(&path).await {
        Ok(f) => f,
        Err(_) => {
            let _ = app.emit(
                "check/result",
                json!({ "fileId": file_id, "verdict": "failed", "fingerprintChecked": Value::Null }),
            );
            return;
        }
    };
    use tokio::io::AsyncReadExt;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1024 * 1024];
    let mut hashed: u64 = 0;
    let mut last_emit = Instant::now();
    loop {
        let n = match file.read(&mut buf).await {
            Ok(0) => break,
            Ok(n) => n,
            Err(_) => {
                let _ = app.emit(
                    "check/result",
                    json!({ "fileId": file_id, "verdict": "failed", "fingerprintChecked": Value::Null }),
                );
                return;
            }
        };
        hasher.update(&buf[..n]);
        hashed += n as u64;
        if last_emit.elapsed() >= Duration::from_millis(200) {
            let _ = app.emit(
                "check/progress",
                json!({ "fileId": file_id, "bytesHashed": hashed, "bytesTotal": total }),
            );
            last_emit = Instant::now();
        }
    }
    let _ = app.emit(
        "check/progress",
        json!({ "fileId": file_id, "bytesHashed": hashed, "bytesTotal": total }),
    );
    let digest = hex::encode(hasher.finalize());
    match expected {
        Some(exp) if exp.eq_ignore_ascii_case(&digest) => {
            let _ = app.emit(
                "check/result",
                json!({ "fileId": file_id, "verdict": "matched", "fingerprintChecked": digest }),
            );
            // The rail's "verified" (S17) transition binds to this real match.
            emit_state(&app, &task_id, st::VERIFIED);
        }
        Some(_) => {
            let _ = app.emit(
                "check/result",
                json!({ "fileId": file_id, "verdict": "mismatched", "fingerprintChecked": digest }),
            );
            emit_state(&app, &task_id, st::FAILED_CHECK);
        }
        None => {
            // Hash produced, but no reference to judge it against -> cannot
            // honestly claim CHECKED.
            let _ = app.emit(
                "check/result",
                json!({ "fileId": file_id, "verdict": "failed", "fingerprintChecked": digest }),
            );
        }
    }
}

// ===================== ENGINE =====================

/// The running worker's loopback endpoint, or `None` when no engine is up.
async fn worker_endpoint<R: Runtime>(app: &tauri::AppHandle<R>) -> Option<(u16, String)> {
    let state = app.try_state::<Arc<tauri_plugin_llamacpp::LlamacppState>>()?;
    let guard = state.engine.lock().await;
    guard.as_ref().map(|h| (h.port, h.api_key.clone()))
}

/// Loads a model on the single worker, starting the worker first if needed.
/// Emits `engine/starting` then `engine/ready` on the REAL load success; never
/// claims a session the worker did not confirm.
#[tauri::command]
pub async fn hb_engine_load<R: Runtime>(
    app: tauri::AppHandle<R>,
    model_id: String,
    file_id: String,
) -> Value {
    let _guard = ENGINE_LOCK.lock().await;
    let _ = app.emit("engine/starting", json!({ "modelId": model_id }));

    // Ensure the worker is running.
    if worker_endpoint(&app).await.is_none() {
        let gguf = file_path(&app, &model_id, &file_id);
        if !gguf.exists() {
            return err(Area::Engine, "core", "MODEL_FILE_MISSING");
        }
        let preset_dir = crate::core::app::commands::get_jan_data_folder_path(app.clone()).join("hb");
        let _ = std::fs::create_dir_all(&preset_dir);
        let slot_dir = preset_dir.join("slots");
        let _ = std::fs::create_dir_all(&slot_dir);
        let preset_path = preset_dir.join("router.preset.ini");
        // Minimal preset: the shared block names the slot-save dir llama.cpp
        // requires to exist; the model section names the gguf to load by id.
        let preset = format!(
            "[*]\nslot-save-path = {}\n\n[{}]\nmodel = {}\n",
            slot_dir.to_string_lossy(),
            file_id,
            gguf.to_string_lossy()
        );
        if std::fs::write(&preset_path, preset).is_err() {
            return core_err(Area::Engine);
        }
        let state = app.state::<Arc<tauri_plugin_llamacpp::LlamacppState>>();
        if let Err(_e) = tauri_plugin_llamacpp::engine::commands::start_engine(
            app.clone(),
            state,
            preset_path.to_string_lossy().to_string(),
            1,
            0,
            std::collections::HashMap::new(),
        )
        .await
        {
            // The worker binary could not start (e.g. absent/stub engine build).
            return err(Area::Engine, "core", "ENGINE_START_FAILED");
        }
    }

    let Some((port, api_key)) = worker_endpoint(&app).await else {
        return err(Area::Engine, "core", "ENGINE_START_FAILED");
    };
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("http://127.0.0.1:{port}/models/load"))
        .bearer_auth(&api_key)
        .json(&json!({ "model": file_id }))
        .send()
        .await;
    match resp {
        Ok(r) => {
            let status = r.status();
            let body = r.text().await.unwrap_or_default();
            if status.is_success() || body.to_lowercase().contains("already") {
                *LOADED.lock().unwrap() = Some((model_id.clone(), file_id.clone()));
                let _ = app.emit("engine/ready", json!({ "modelId": model_id }));
                ok(json!({ "session": uuid::Uuid::new_v4().to_string() }))
            } else if body.to_lowercase().contains("out of memory") || body.to_lowercase().contains("oom") {
                let _ = app.emit(
                    "engine/oom",
                    json!({ "modelId": model_id, "oomKind": "load", "biggestThatFits": { "modelId": model_id, "fileId": file_id } }),
                );
                core_err(Area::Engine)
            } else {
                let _ = app.emit("engine/crashed", json!({ "modelId": model_id, "kind": "generic" }));
                core_err(Area::Engine)
            }
        }
        Err(_) => core_err(Area::Engine),
    }
}

#[tauri::command]
pub async fn hb_engine_unload<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let _guard = ENGINE_LOCK.lock().await;
    let loaded_file = LOADED.lock().unwrap().as_ref().map(|(_, f)| f.clone());
    let target = loaded_file.unwrap_or_else(|| model_id.clone());
    if let Some((port, api_key)) = worker_endpoint(&app).await {
        let client = reqwest::Client::new();
        let _ = client
            .post(format!("http://127.0.0.1:{port}/models/unload"))
            .bearer_auth(&api_key)
            .json(&json!({ "model": target }))
            .send()
            .await;
    }
    *LOADED.lock().unwrap() = None;
    let _ = app.emit("engine/unloaded", json!({ "modelId": model_id }));
    ok(json!({}))
}

/// Reports the live loaded model as a full `modelFile`, but only when the
/// worker confirms a loaded id AND this surface holds the matching record.
#[tauri::command]
pub async fn hb_engine_get_loaded<R: Runtime>(app: tauri::AppHandle<R>) -> Value {
    let Some((port, api_key)) = worker_endpoint(&app).await else {
        return ok(Value::Null);
    };
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("http://127.0.0.1:{port}/models"))
        .bearer_auth(&api_key)
        .send()
        .await;
    let loaded_ids: Vec<String> = match resp {
        Ok(r) => match r.json::<Value>().await {
            Ok(v) => v
                .get("data")
                .or_else(|| v.get("models"))
                .and_then(Value::as_array)
                .map(|arr| {
                    arr.iter()
                        .filter(|m| {
                            m.get("status")
                                .and_then(|s| s.get("value"))
                                .and_then(Value::as_str)
                                .map(|s| s.eq_ignore_ascii_case("loaded"))
                                .unwrap_or(true)
                        })
                        .filter_map(|m| m.get("id").and_then(Value::as_str).map(str::to_string))
                        .collect()
                })
                .unwrap_or_default(),
            Err(_) => return ok(Value::Null),
        },
        Err(_) => return ok(Value::Null),
    };
    let rec = LOADED.lock().unwrap().clone();
    match rec {
        Some((model_id, file_id)) if loaded_ids.iter().any(|id| id == &file_id || id == &model_id) => {
            ok(json!({ "modelId": model_id, "fileId": file_id }))
        }
        _ => ok(Value::Null),
    }
}

/// Streams a chat completion from the worker. Emits `engine/first-token` on the
/// FIRST real streamed content delta -- the single milestone that flips the run
/// indicator to "running" (§5.1) -- and returns the accumulated reply. No token
/// is ever synthesized.
#[tauri::command]
pub async fn hb_engine_infer<R: Runtime>(
    app: tauri::AppHandle<R>,
    model_id: String,
    messages: Value,
    _context: Value,
) -> Value {
    let Some((port, api_key)) = worker_endpoint(&app).await else {
        return err(Area::Engine, "unavailable", "UNAVAILABLE");
    };
    let target = LOADED
        .lock()
        .unwrap()
        .as_ref()
        .map(|(_, f)| f.clone())
        .unwrap_or_else(|| model_id.clone());
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("http://127.0.0.1:{port}/v1/chat/completions"))
        .bearer_auth(&api_key)
        .json(&json!({ "model": target, "messages": messages, "stream": true }))
        .send()
        .await;
    let resp = match resp {
        Ok(r) if r.status().is_success() => r,
        _ => return core_err(Area::Engine),
    };
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut text = String::new();
    let mut first_token_seen = false;
    while let Some(chunk) = stream.next().await {
        let Ok(bytes) = chunk else { break };
        buffer.push_str(&String::from_utf8_lossy(&bytes));
        // Parse complete SSE lines; keep any trailing partial line in `buffer`.
        while let Some(nl) = buffer.find('\n') {
            let line = buffer[..nl].trim().to_string();
            buffer.drain(..=nl);
            let Some(data) = line.strip_prefix("data:").map(str::trim) else { continue };
            if data == "[DONE]" {
                buffer.clear();
                break;
            }
            if let Ok(v) = serde_json::from_str::<Value>(data) {
                if let Some(delta) = v
                    .get("choices")
                    .and_then(Value::as_array)
                    .and_then(|c| c.first())
                    .and_then(|c| c.get("delta"))
                    .and_then(|d| d.get("content"))
                    .and_then(Value::as_str)
                {
                    if !delta.is_empty() {
                        if !first_token_seen {
                            first_token_seen = true;
                            let _ = app.emit("engine/first-token", json!({ "modelId": model_id }));
                        }
                        text.push_str(delta);
                    }
                }
            }
        }
    }
    if !first_token_seen {
        // The worker returned no streamed content -- do not fabricate a reply.
        return core_err(Area::Engine);
    }
    ok(json!({ "text": text }))
}

// ===================== LIBRARY / STORAGE =====================

#[tauri::command]
pub async fn hb_library_list<R: Runtime>(app: tauri::AppHandle<R>) -> Value {
    let dir = models_dir(&app);
    let mut records: Vec<Value> = Vec::new();
    if let Ok(mut entries) = tokio::fs::read_dir(&dir).await {
        while let Ok(Some(model_entry)) = entries.next_entry().await {
            if !model_entry.path().is_dir() {
                continue;
            }
            let model_id = model_entry.file_name().to_string_lossy().to_string();
            if model_id.starts_with('.') {
                continue; // skip .trash and dotfiles
            }
            if let Ok(mut files) = tokio::fs::read_dir(model_entry.path()).await {
                while let Ok(Some(f)) = files.next_entry().await {
                    let name = f.file_name().to_string_lossy().to_string();
                    if name.ends_with(".part") {
                        continue;
                    }
                    let size = f.metadata().await.map(|m| m.len()).unwrap_or(0);
                    records.push(json!({
                        "modelId": model_id, "fileId": name, "size": size,
                        "checkVerdict": Value::Null, "lastOpenedAt": Value::Null
                    }));
                }
            }
        }
    }
    ok(records)
}

#[tauri::command]
pub async fn hb_library_details<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let dir = models_dir(&app).join(sanitize(&model_id));
    let mut bytes: u64 = 0;
    if let Ok(mut files) = tokio::fs::read_dir(&dir).await {
        while let Ok(Some(f)) = files.next_entry().await {
            bytes += f.metadata().await.map(|m| m.len()).unwrap_or(0);
        }
    }
    ok(json!({ "path": dir.to_string_lossy(), "bytes": bytes, "fingerprint": Value::Null }))
}

/// Soft-delete: move the model dir under `<models>/.trash/` so `restore` can
/// bring it back. `purge` removes it permanently.
#[tauri::command]
pub async fn hb_library_delete<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let src = models_dir(&app).join(sanitize(&model_id));
    let trash = models_dir(&app).join(".trash");
    let _ = tokio::fs::create_dir_all(&trash).await;
    let dst = trash.join(sanitize(&model_id));
    match tokio::fs::rename(&src, &dst).await {
        Ok(_) => ok(json!({})),
        Err(_) => core_err(Area::Storage),
    }
}

#[tauri::command]
pub async fn hb_library_restore<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let dst = models_dir(&app).join(sanitize(&model_id));
    let src = models_dir(&app).join(".trash").join(sanitize(&model_id));
    match tokio::fs::rename(&src, &dst).await {
        Ok(_) => ok(json!({})),
        Err(_) => core_err(Area::Storage),
    }
}

#[tauri::command]
pub async fn hb_library_purge<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let trashed = models_dir(&app).join(".trash").join(sanitize(&model_id));
    let live = models_dir(&app).join(sanitize(&model_id));
    let _ = tokio::fs::remove_dir_all(&trashed).await;
    let _ = tokio::fs::remove_dir_all(&live).await;
    ok(json!({}))
}

#[tauri::command]
pub async fn hb_storage_free_space<R: Runtime>(app: tauri::AppHandle<R>) -> Value {
    let dir = models_dir(&app);
    match free_bytes(&dir) {
        Some(bytes) => ok(json!({ "bytes": bytes, "path": dir.to_string_lossy() })),
        None => core_err(Area::Storage),
    }
}

#[tauri::command]
pub async fn hb_storage_resolve<R: Runtime>(app: tauri::AppHandle<R>) -> Value {
    let dir = models_dir(&app);
    let reachable = tokio::fs::create_dir_all(&dir).await.is_ok();
    ok(json!({ "path": dir.to_string_lossy(), "reachable": reachable }))
}

/// The data root is app-managed in this build; changing it is a separate
/// migration surface, so this fails closed rather than silently no-op.
#[tauri::command]
pub async fn hb_storage_set_root<R: Runtime>(_app: tauri::AppHandle<R>, _path: String) -> Value {
    err(Area::Storage, "core", "ROOT_APP_MANAGED")
}

#[tauri::command]
pub async fn hb_storage_measure<R: Runtime>(app: tauri::AppHandle<R>, model_id: String) -> Value {
    let dir = models_dir(&app).join(sanitize(&model_id));
    let mut bytes: u64 = 0;
    if let Ok(mut files) = tokio::fs::read_dir(&dir).await {
        while let Ok(Some(f)) = files.next_entry().await {
            bytes += f.metadata().await.map(|m| m.len()).unwrap_or(0);
        }
    }
    ok(json!({ "bytes": bytes }))
}

// ===================== CATALOG =====================

/// Local cache read only -- no network (§0.6 law 7). Returns the honest empty
/// catalog when no cache has been written yet.
#[tauri::command]
pub async fn hb_catalog_read_cache<R: Runtime>(app: tauri::AppHandle<R>) -> Value {
    let path = crate::core::app::commands::get_jan_data_folder_path(app.clone())
        .join("hb")
        .join("catalog.json");
    if let Ok(raw) = tokio::fs::read_to_string(&path).await {
        if let Ok(v) = serde_json::from_str::<Value>(&raw) {
            if v.get("records").is_some() {
                return ok(v);
            }
        }
    }
    ok(json!({ "records": [], "fetchedAt": Value::Null }))
}
