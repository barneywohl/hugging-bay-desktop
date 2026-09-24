//! Hugging Bay native command surface.
//!
//! The renderer speaks a fixed, typed wire contract (see
//! `web-app/src/hb/ipc/*`): dotted command names like `downloads.start` and
//! `engine.load`, an `{ ok, value } | { ok, error }` result envelope, and a set
//! of `area/event` names the mirror stores listen on. Tauri command handlers
//! must be Rust identifiers, so the renderer's transport maps each wire name to
//! the `hb_*` handler registered here (e.g. `downloads.start` -> the
//! `hb_downloads_start` handler); the handler name is the ONLY translation.
//!
//! Honesty contract (ENGINEERING_SPEC §0.6): a handler emits a milestone event
//! ONLY on the real underlying signal. `engine/first-token` fires on the first
//! real streamed token, never before; `check/result { matched }` fires only on
//! a byte-verified SHA-256 match; download states mirror the real transfer.
//! Every failure is fail-closed as an `HB-<AREA>-<KIND>` envelope; nothing here
//! fabricates a task id, a loaded session, or a success the engine/verifier did
//! not produce. The only network egress is the model download itself (and the
//! engine's own loopback HTTP to the worker).

pub mod commands;

use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, LazyLock, Mutex};
use tokio::sync::Mutex as AsyncMutex;
use tokio_util::sync::CancellationToken;

/// The wire areas, matched to `schemas.ts`'s `area` enum. Only the areas this
/// native surface actually serves are represented here.
#[derive(Clone, Copy)]
pub enum Area {
    Download,
    Check,
    Engine,
    Storage,
    Catalog,
    Connect,
}

impl Area {
    fn code(self) -> &'static str {
        match self {
            Area::Download => "DOWNLOAD",
            Area::Check => "CHECK",
            Area::Engine => "ENGINE",
            Area::Storage => "STORAGE",
            Area::Catalog => "CATALOG",
            Area::Connect => "CONNECT",
        }
    }
}

/// A fail-closed envelope the renderer's `resultSchema` parses as `{ ok:false,
/// error }`. `kind` is one of the client's `HbError['kind']` values; the `code`
/// grammar is `HB-<AREA>-<SUFFIX>` (see `schemas.ts` `hbError`).
pub fn err(area: Area, kind: &str, suffix: &str) -> Value {
    json!({ "ok": false, "error": { "code": format!("HB-{}-{}", area.code(), suffix), "kind": kind } })
}

/// The `core`-kind failure: the underlying primitive refused. Carries no
/// guessed cause text (the renderer never renders `cause`; §hbError).
pub fn core_err(area: Area) -> Value {
    err(area, "core", "CORE")
}

/// A resolved-success envelope the renderer parses as `{ ok:true, value }`.
pub fn ok<T: Serialize>(value: T) -> Value {
    json!({ "ok": true, "value": value })
}

// ---- shared paths -------------------------------------------------------

/// `<jan data folder>/models` — where GGUF files land and the library reads.
pub fn models_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PathBuf {
    crate::core::app::commands::get_jan_data_folder_path(app.clone()).join("models")
}

/// A filesystem-safe directory name for a model id (`org/repo` -> `org__repo`).
pub fn sanitize(model_id: &str) -> String {
    model_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '.' || c == '_' { c } else { '_' })
        .collect()
}

/// The on-disk GGUF path for a (model, file) pair.
pub fn file_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>, model_id: &str, file_id: &str) -> PathBuf {
    models_dir(app).join(sanitize(model_id)).join(file_id)
}

/// The canonical Hugging Face resolve URL for a file. `source` is preserved
/// attribution; only the `huggingface` source is resolvable to a URL here, and
/// any other source fails closed rather than guessing a host.
pub fn resolve_url(source: &str, model_id: &str, file_id: &str) -> Option<String> {
    if source.eq_ignore_ascii_case("huggingface") || source.eq_ignore_ascii_case("hf") {
        Some(format!("https://huggingface.co/{model_id}/resolve/main/{file_id}?download=true"))
    } else {
        None
    }
}

// ---- the task registry --------------------------------------------------

/// The 19-state download machine's states, as the renderer's `deriveTask`
/// maps them (`downloads/model.ts`). Only the states this native rail actually
/// drives are named; the renderer mirrors whichever `to` it receives.
pub mod state {
    pub const QUEUED: &str = "S1";
    pub const CONNECTING: &str = "S2";
    pub const DOWNLOADING: &str = "S3";
    pub const PAUSED: &str = "S6";
    pub const VERIFYING: &str = "S14";
    pub const VERIFIED: &str = "S17";
    pub const FAILED_CHECK: &str = "S18";
    pub const CANCELED: &str = "C1A";
}

/// One live (or completed) download. The cancel token stops the transfer loop;
/// `paused` distinguishes a pause (keep partial, resumable) from a true cancel
/// (discard partial). `last_state` lets the verifier emit the S16->S17 rail
/// transition against the right task on a real match.
pub struct TaskRec {
    pub model_id: String,
    pub file_id: String,
    pub source: String,
    pub url: String,
    pub save_path: PathBuf,
    pub cancel: CancellationToken,
    pub paused: bool,
    pub last_state: String,
    /// The expected SHA-256 the download was armed with (the catalog's published
    /// fingerprint / the receipt's `expectedFingerprint`). `None` when the source
    /// carried no reference: the verifier then hashes for real but cannot claim a
    /// match. This is what lets a correct download reach CHECKED (S17).
    pub expected_fingerprint: Option<String>,
}

pub struct Registry {
    pub tasks: HashMap<String, TaskRec>,
    pub file_to_task: HashMap<String, String>,
}

pub static REGISTRY: LazyLock<Mutex<Registry>> = LazyLock::new(|| {
    Mutex::new(Registry { tasks: HashMap::new(), file_to_task: HashMap::new() })
});

/// Serializes engine load/unload so a second load cannot race the first onto
/// the single worker. Not the worker's own lock -- purely this surface's.
pub static ENGINE_LOCK: LazyLock<Arc<AsyncMutex<()>>> = LazyLock::new(|| Arc::new(AsyncMutex::new(())));

/// The (modelId, fileId) this surface last loaded, cleared on unload. The
/// worker only knows its own opaque model id, so `engine.get_loaded` reports a
/// full `modelFile` ONLY when the worker confirms a live model AND this record
/// exists -- it never fabricates a fileId for a session it did not load.
pub static LOADED: LazyLock<Mutex<Option<(String, String)>>> = LazyLock::new(|| Mutex::new(None));

// ---- free space ---------------------------------------------------------

/// Bytes free on the filesystem holding `path`, via `statvfs`. Returns `None`
/// rather than a fabricated number when the syscall fails.
#[cfg(unix)]
pub fn free_bytes(path: &Path) -> Option<u64> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    // Walk up to the nearest existing ancestor: statvfs needs a real path.
    let mut probe = path.to_path_buf();
    while !probe.exists() {
        match probe.parent() {
            Some(p) => probe = p.to_path_buf(),
            None => return None,
        }
    }
    let c = CString::new(probe.as_os_str().as_bytes()).ok()?;
    // SAFETY: `c` is a valid NUL-terminated path; `stat` is zeroed and only read
    // on a zero (success) return.
    unsafe {
        let mut stat: libc::statvfs = std::mem::zeroed();
        if libc::statvfs(c.as_ptr(), &mut stat) == 0 {
            Some((stat.f_bavail as u64).saturating_mul(stat.f_frsize as u64))
        } else {
            None
        }
    }
}

#[cfg(not(unix))]
pub fn free_bytes(_path: &Path) -> Option<u64> {
    None
}
