/*
 * Hugging Bay — verbatim copy register.
 * Product copy is from APP_SPEC §15.1 plus COPY_LOCK_ADDENDUM (2026-09-24).
 * Addendum locks override stale APP_SPEC bodies. Changing a lock requires a
 * new Jev pass. Templated values ({name}, {size}, ...) bind live at render.
 * The banned mascot word never appears in any product string (enforced by the design-system lint).
 */

export const COPY = {
  // Lane 0 scaffold labels only; not Jev-tested product-flow copy.
  shell: {
    app: 'The Hugging Bay', firstRun: 'Welcome', discover: 'Discover',
    modelDetail: 'Model details', downloads: 'Downloads', verify: 'File check',
    chat: 'Chat', library: 'Library', engine: 'Model runner', updates: 'Updates',
    settings: 'Settings', fit: 'Check this Mac', advanced: 'Advanced',
    unavailable: "This screen isn't available yet.",
    error: "This screen couldn't be opened.",
    notFound: "This screen couldn't be found.",
    navigation: 'Main navigation',
  },
  f1: {
    s1: {
      welcome: 'Welcome to The Hugging Bay.',
      tagline: 'AI programs that run on your own computer.',
      body:
        "First, we'll take a quick look at this Mac — how much memory it has — so we only show you programs that can run here. The check happens on this machine.",
      primary: 'Check this Mac',
      quiet: 'No admin password needed — it installs just for you.',
    },
    s2: {
      checking: 'Checking this Mac…',
      soWeOnly: 'so we only show programs that fit.',
      readingMemory: 'Reading memory… ✓',
      readingChip: 'Reading the chip… ✓',
      figuring: 'Figuring out what fits… ✓',
      takesSeconds: 'This takes a few seconds.',
      tooLong: 'Taking too long?',
      skip: 'Skip the check',
      offline:
        "You're offline — that's fine. The check runs on this Mac, and this app works offline. You'll need the internet to download a program.",
    },
    s3: {
      headline:
        "We'll only show programs that fit — nothing too big, nothing that won't run.",
      memory: 'Memory is the space your computer uses to think while it works.',
      whatDidYouCheck: 'What did you check? ▸',
      whatDidYouCheckAnswer:
        "We read this Mac's memory size and chip type, on this machine — nothing was sent anywhere.",
      primary: 'See programs that fit',
      weak: "On this machine, smaller programs run best — that's what you'll see here.",
      // H-APP-5 carry-over promise (coupled to PR-3)
      carryOver: 'Your downloads from this site carry over — the app finds them.',
    },
    s5: {
      // "Welcome back. Your {N} downloaded programs are still here ..."
      body: (n: number) =>
        `Welcome back. Your ${n} downloaded programs are still here — nothing to re-download, nothing to set up again.`,
      primary: 'Open my Library',
      quiet: 'Browse more programs',
    },
    s6: 'Skipped the check — you can run it anytime from Settings.',
  },

  f2: {
    hero: 'AI programs that run on your own computer — private, offline, yours.',
    search: 'Search programs…  ⌘K', // two spaces — canonical
    chips: [
      'For chatting',
      'For writing code',
      'For making pictures',
      'Fits my computer ✓',
      'Small downloads · under 2 GB',
      'More filters — for experts',
    ],
    purposeDefault: 'Chat with it — ask questions, get explanations, draft anything.',
    aboutDownload: 'About this download',
    hideAgain: 'Hide them again',
    s2Matched: (q: string) => `Matched: "${q}" — your words, our chip.`,
    s3NoResults: "We looked — there's nothing we can give you for that right now.",
    s3Try: 'Try fewer words, or',
    s3ShowAll: 'show all 47 programs',
    s4Title: 'More filters — for experts. The defaults already choose well.',
    s4Notes: [
      'smaller files download faster and need less memory',
      'the permission for using it',
      'the file type — the default is fine',
    ],
    s7Showing: 'Showing 47 programs.',
    s7CheckButton: 'Check my computer',
    s7CardFit:
      "We can't check the fit — we don't know your machine. [Check my machine (3 questions)]",
    s7Alt: 'Or answer 3 quick questions instead',
    partial: "The newest list wouldn't load — here's what we have saved.",
  },

  f3: {
    howDoYouKnow: 'How do you know?',
    notMyMachine: "That's not my machine",
    purposeLabel: 'Like ChatGPT — but it runs on your own computer',
    purposeDefault: 'Chat with it — ask questions, get explanations, draft anything.',
    notFor: 'Not a fact-checker. Not a search engine. It can be confidently wrong.',
    tryLine:
      'Not sure what you’d use it for? Try one question — that’s the whole test. Try: "Explain photosynthesis like I’m five."',
    downloadCta: (size: string) => `Download — ${size}`,
    reassurance:
      "It'll appear in your Library when it's done — there's nothing to find or clean up.",
    promise:
      "We'll check the file when it arrives. Every file has a fingerprint — we'll compare yours to the one we published.",
    fingerprintExperts: 'File fingerprint (for experts) ›',
    copied: 'Copied ✓',
    verifyAgain: 'Verify again',
    defaultFileNote:
      'You don\'t need to know what a "model" is. This is the one for chatting.' ,
    // Verification explainer — shown by default (won the main battery)
    verificationExplainer:
      'You can’t, fully — and we won’t pretend otherwise. Here’s what we actually do: We record the file’s fingerprint (9f3a…42cd) when we post it — a file’s unchangeable ID. If even one byte changes, this changes. When your download arrives, we check it against that fingerprint automatically. The check proves the file arrived unchanged — not that it’s safe. No check can prove a model is safe. The license (MIT) is what the source states — we record it, we don’t verify it. "Posted by the Bay team" names the poster, not the author. Downloading can’t hurt your computer by itself — it’s just a file, like a photo. Nothing runs unless you choose to run it. Something wrong with this file? Report it ›',
    s2Rescue: "Not downloading — this one wouldn't run on this Mac.",
    s2See: 'See models that fit this Mac',
    s3Checked: '✓ Checked — this is the file we expected.',
    s3Limitation: 'That proves it arrived unchanged, not that the model is safe.',
    s3Start: 'Start chatting',
    s5Preflight: (need: string, free: string) =>
      `Not enough room to download — the download needs ${need}, and this Mac has ${free} free. Your Mac can run it once there's room.`,
    s5FreeUp: 'See how to free up space',
    s6Ack:
      "Fit check unavailable — we don't know this machine. You can still download if you're sure it fits.",
    lighter: (size: string) => `Download the lighter version — ${size}`,
    lighterQuiet: "I want the full version anyway — it'll likely run out of memory",
    // H-APP-1 deep-link narration
    reverify: 'Checking it again — making sure this is the file the website sent.',
  },

  f4: {
    orientation: (name: string, fit: string, size: string) =>
      `Your download: ${name} — ${fit}, ${size}.`,
    fileDetails: 'File details',
    phases: ['Getting', 'Checking', 'Ready'],
    getting: (pct: number, got: string, total: string) =>
      `Downloading — ${pct}% · ${got} of ${total}.`,
    eta: (mins: number) => `About ${mins} min left.`,
    promise:
      "We'll check the file when it arrives. Every file has a fingerprint — we'll compare yours to the one we published.",
    background: 'You can close the window — the download keeps going in the background.',
    checking: 'Downloaded — checking the file…',
    checkingSub: 'This usually takes a few seconds.',
    readyChecked: '✓ Checked — this is the file we expected.',
    readyLimitation: 'That proves it arrived unchanged, not that the model is safe.',
    start: 'Start chatting',
    // states
    s0: "This one's already downloaded — checked and ready.",
    s0Again: 'Download it again anyway',
    s3: (pct: number, got: string, total: string) =>
      `Still downloading — ${pct}% · ${got} of ${total}.`,
    s3Sub: 'No time estimate while the speed is unsteady.',
    s4: 'Still downloading, slowly… No time estimate while the speed is low.',
    s5: 'The download has stalled — trying again.',
    s5Saved: (saved: string, total: string) => `${saved} of ${total} is saved and safe.`,
    s5Resume: 'Resume download',
    s7: (pct: number, saved: string, total: string) =>
      `Your download stopped at ${pct}% — ${saved} of ${total} is saved.`,
    s7Resume: (pct: number) => `Resume from ${pct}%`,
    s8: 'The download stopped — your disk is full.',
    s8Sub: (saved: string, total: string) =>
      `${saved} of ${total} is saved. Free space and the download continues on its own.`,
    s13: (size: string) => `You're on mobile data — this download is ${size}.`,
    s13Wait: 'Wait for wifi',
    s13Anyway: 'Download anyway',
    s19: 'Queued — starts when the current download finishes.',
    checkFailed: "We couldn't run the check on this file.",
    checkFailedSub:
      "That doesn't mean the file is bad — it means we don't know. Don't treat it as checked.",
    // G2B-35, LOCKED 2026-09-24; status text beside the disabled Chat action.
    chatDisabled: "We don't know this is the right file yet — chatting stays off until the check passes.",
    // M2; permission mechanism remains gated until the native notify owner lands.
    notifyPrePrompt: 'Want us to let you know when your download finishes?',
    checkFailedRetry: 'Try the check again',
    mismatch: "This file isn't the one we expected. Don't use it.",
    mismatchSub:
      "The file's fingerprint doesn't match the one we published. It may be damaged — or it may not be the file you asked for.",
    mismatchDelete: 'Delete it and download again',
    dlEmpty: 'Nothing downloading right now.',
    dlEmptyBrowse: 'Browse models',
  },

  f6: {
    running: (name: string) => `● ${name} is running`,
    orientation: 'Chatting with an AI program on this Mac.',
    headline: 'What do you want to ask?',
    placeholder: 'Ask anything...',
    tryLine:
      'Not sure where to start? Try one question — that’s the whole test. Try: "Explain photosynthesis like I’m five."',
    send: 'Send',
    pill: 'Runs on this Mac',
    notFor: 'Not a fact-checker. Not a search engine. It can be confidently wrong.',
    newChat: '[+] New chat',
    recent: 'Recent chats',
    // S2 privacy pill expanded
    s2a:
      'The model runs on this computer — it answers using the file you downloaded. No account, no sign-in.',
    // L6 / CA-11, LOCKED 2026-09-24.
    s2b: "Your chats stay on this Mac — they're kept here, like files you save on your computer.",
    s2Delete: 'Delete this chat',
    // S4 stalled-wait
    s4: (name: string) => `Starting ${name}… it's taking a while.`,
    s4Quiet: 'Choose a different model',
    // S6 stopped
    stop: 'Stop',
    tryAgain: 'Try again',
    // S8 crash
    s8: (name: string) => `${name} stopped unexpectedly.`,
    s8Sub: 'Your chat is still here — nothing you wrote is lost.',
    s8Start: 'Start it again',
    s8Quiet: 'Choose a different model',
    // S11 recent chats
    newChatTitle: 'New chat',
    delete: 'Delete',
  },

  f7: {
    header: 'Library',
    intro: "Everything you've downloaded, in one place — real sizes, nothing hidden.",
    meterUsed: (used: string, total: string) => `${used} of ${total} used for models.`,
    meterFree: (free: string) => `You still have ${free} free.`,
    rowSize: (size: string) => size,
    lastOpened: (when: string) => `Last opened ${when}`,
    neverOpened: 'Never opened',
    chat: 'Chat',
    storageTitle: 'Your models live in a folder on this Mac.',
    storagePath: '~/.huggingbay/models',
    storageTilde: 'The ~ is shorthand for your home folder — the folder with your name on it.',
    // L2 delete (inline confirm, never a modal)
    l2: (name: string, size: string) => `Delete ${name}? This frees ${size} right away.`,
    l2Quiet: 'Deleting frees the space immediately. Nothing hides.',
    l2Delete: 'Delete it',
    l2Keep: 'Keep it',
    l2Announce: (name: string, size: string) => `Deleted ${name} — ${size} freed.`,
    // L3 recently deleted
    l3: 'Recently deleted',
    l3Again: 'Download again',
    // L4 empty
    l4: 'Your library is empty.',
    l4Teach:
      'A model is the AI itself. Download one and it lives here — then you can chat with it on this Mac.',
    // L6 move toast
    l6: (n: number, dest: string) => `Moved — your ${n} models are now in ${dest}.`,
    // L7 storage unreachable
    l7: "We can't find your models.",
    l7Sub:
      'The folder may have moved, or the drive may be unplugged. Your list is safe — nothing was deleted.',
    l7Row: "Can't reach the file right now",
    l7Locate: 'Locate the folder again',
    // H-APP-2 found-files card
    foundFiles: (n: number) => `We found ${n} model files in your Downloads folder.`,
    foundFilesAdd: "Add them to your library — we'll check each file arrived unchanged first.",
    foundFilesAddCta: 'Add to my library',
    foundFilesSkip: 'Skip for now',
    foundFilesUnmatched: (file: string) =>
      `${file} — we couldn't identify this file, so it isn't checked.`,
  },

  f8: {
    // switcher rows: {name} / {fit verdict}
    switcherGetMore: 'Get more models',
    runningNow: '● Running now',
    // M1 load-time variant, verified LOCKED in COPY_LOCK_ADDENDUM.
    // Keep distinct from the chat-time S5 rescue; bind measured memory only.
    loadMemoryFailure: (model: string) =>
      `This Mac doesn't have enough memory to load ${model}. Your Mac is fine — nothing broke, and your chats are safe.`,
    loadMemoryQuiet: (needGB: number, haveGB: number) =>
      `Closing other apps won't help enough — the model needs about ${needGB} GB, and this Mac has ${haveGB} GB.`,
    // S5 OOM rescue
    s5Head: "Let's switch to the version that fits.",
    s5Body: (model: string) =>
      `${model} needed more memory than your Mac has — your chats are safe, nothing you wrote is lost.`,
    s5Bridge:
      'Memory is the space your computer uses to think while it works — this program needed a bigger desk than this Mac has.',
    s5Cta: (rescue: string) => `Use ${rescue} — fits this Mac`,
    s5Why: 'Why did this happen? ▸',
    // S6 memory pressure
    s6: (model: string) =>
      `Replies are slow right now — ${model} is using almost all of this Mac's memory. (Memory is the space your Mac uses to think while it works.) Your chats are safe — nothing is lost.`,
    s6Cta: (rescue: string) => `Use ${rescue} — faster on this Mac`,
  },

  f10: {
    rows: ['Downloads', 'Updates', 'What this app sends.', 'About'],
    about: {
      title: (v: string) => `The Hugging Bay — ${v}`,
      builtOn: 'Built on Jan. © 2025 Menlo Research. Apache License 2.0.',
      fork: 'This is a modified fork of Jan.',
      changed: "See what's changed",
      license: 'Read the license',
    },
    sends: {
      // default: gate CLOSED (F10-5)
      titleClosed: 'What this app sends.',
      closed:
        "Here's everything the app sends today: update checks to our update server, so the app knows a new version exists.",
    },
  },
} as const

export const FIT = {
  runs: (needGB: number, haveGB: number) =>
    `✓ Runs on this Mac — needs about ${needGB} GB of memory. This Mac has ${haveGB} GB.`,
  tooBig: (needGB: number, haveGB: number) =>
    `✕ Too big for this Mac — it needs about ${needGB} GB of memory, and yours has ${haveGB} GB.`,
  unknown: "We can't check the fit — we don't know your machine.",
} as const
