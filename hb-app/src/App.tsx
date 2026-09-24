import { useState } from 'react'
import { Sidebar, Content, type Section } from './components'
import { FirstRun } from './screens/FirstRun'
import { Discover } from './screens/Discover'
import { ModelDetail } from './screens/ModelDetail'
import { Download } from './screens/Download'
import { Chat } from './screens/Chat'
import { Library } from './screens/Library'
import { Settings } from './screens/Settings'
import { Backlog } from './screens/Backlog'
import { COPY } from './copy'
import { type Model } from './data'

export default function App() {
  const [firstRun, setFirstRun] = useState(true)
  const [section, setSection] = useState<Section>('discover')
  const [detail, setDetail] = useState<Model | null>(null)
  const [downloading, setDownloading] = useState<Model | null>(null)
  const [chatModel, setChatModel] = useState<Model | null>(null)
  const [library, setLibrary] = useState<Model[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  function applyTheme(next: 'light' | 'dark') {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  if (firstRun) {
    return (
      <div className="hb-app">
        <div className="hb-main">
          <FirstRun
            onDone={() => {
              setFirstRun(false)
              setSection('discover')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="hb-app">
      <Sidebar
        active={section}
        onNav={(s) => {
          setSection(s)
          setDetail(null)
        }}
        theme={theme}
        onTheme={() => applyTheme(theme === 'light' ? 'dark' : 'light')}
      />
      <div className="hb-main">
        {/* Discover section (with detail sub-view) */}
        {section === 'discover' &&
          (detail ? (
            <Content>
              <button className="hb-link-quiet" onClick={() => setDetail(null)}>
                ‹ Back to Discover
              </button>
              <ModelDetail
                model={detail}
                onSeeFits={() => setDetail(null)}
                onDownload={(m) => {
                  setDownloading(m)
                  setSection('downloads')
                  setDetail(null)
                }}
              />
            </Content>
          ) : (
            <Content>
              <Discover onOpen={(m) => setDetail(m)} />
            </Content>
          ))}

        {/* Downloads section (F4 rail if active, else F4-DL empty) */}
        {section === 'downloads' && (
          <Content>
            {downloading ? (
              <Download
                model={downloading}
                onChat={() => {
                  setLibrary((lib) => (lib.find((x) => x.id === downloading.id) ? lib : [...lib, downloading]))
                  setChatModel(downloading)
                  setDownloading(null)
                  setSection('chat')
                }}
              />
            ) : (
              <div className="hb-card">
                <h2 className="hb-headline">{COPY.f4.dlEmpty}</h2>
                <button className="hb-btn hb-btn-primary" onClick={() => setSection('discover')}>
                  {COPY.f4.dlEmptyBrowse}
                </button>
              </div>
            )}
          </Content>
        )}

        {/* Chat section */}
        {section === 'chat' && (
          <Content width="chat">
            {chatModel ? (
              <Chat model={chatModel} onSwitch={(m) => setChatModel(m)} />
            ) : (
              <div className="hb-card">
                <h2 className="hb-headline">No models yet</h2>
                <p className="hb-body hb-secondary">{COPY.f6.notFor}</p>
                <button className="hb-btn hb-btn-primary" onClick={() => setSection('discover')}>
                  {COPY.f4.dlEmptyBrowse}
                </button>
              </div>
            )}
          </Content>
        )}

        {/* Library section */}
        {section === 'library' && (
          <Content>
            <Library
              library={library}
              onBrowse={() => setSection('discover')}
              onChat={(m) => {
                setChatModel(m)
                setSection('chat')
              }}
              onDelete={(m) => setLibrary((lib) => lib.filter((x) => x.id !== m.id))}
            />
          </Content>
        )}

        {/* Settings section + roadmap */}
        {section === 'settings' && (
          <Content>
            <Settings />
            <div className="hb-divider" />
            <Backlog />
          </Content>
        )}
      </div>
    </div>
  )
}
