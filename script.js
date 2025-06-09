// SHA-256 helper
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

const SECRET_HASH =
  '62a273e73d84b489fd732176ee6767730b59246f07a5742ef7b1c40b573e2174';

const lockScreen = document.getElementById('lock-screen');
const terminal = document.getElementById('terminal');
const unlockBtn = document.getElementById('unlock-btn');
const secretInput = document.getElementById('secret-input');
const errorMsg = document.getElementById('error-msg');

const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');

const passwordHashes = {
  frag03: '12423e0482f3e81cb1d23230664e95bb3d11b9f34f06fc199e588d4cdab6e4d4',
  frag07: '27fed9b0eb7dab9766493fe2c8695c5fd4428cf8169e85452fcce54abba5a067',
  frag11: 'e2c30d59264829011fe7ce30b39db9705fb6ca02924bac9f15cf1ff9626b6c38',
  frag09: 'd5259acec0d80c4fe1347fc3aa805624b6f37a052d24018a8c38f3c2e9807d21',
  frag12: '1cf3ea7bc0dbb4ab6ee85ae836557bbb909f06629a059e6dd09aa065ef11dc13',
  botbait: '08077647029b6dc8fc3b1722fe49336dfffa14229b3a7ceee0affc409c391bf7',
  chunk77: '545ab5e51ec232a46eacfd143e5766002cf251e12d59a0ef143f249610407890',
  reveal: 'c62f98597f5cf5a1182008105d8493f136299dfc815d91b51afec34b8f50ac18',
};

async function checkPassword(mode, userInput) {
  const hash = await sha256(userInput.trim());
  return hash === passwordHashes[mode];
}

let unlockWrongAttempts = 0;
let currentPassMode = null;
let currentContent = null;
let isPasswordMode = false;
let actualPasswordInput = '';
let isLocked = false;
let isBlocked = false;
let isOverrideActive = false;

window.addEventListener('DOMContentLoaded', () => {
  unlockBtn.addEventListener('click', unlockAttempt);
  secretInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      unlockAttempt();
    }
  });

  document.getElementById('glitched-img').addEventListener('click', () => {
    const modal = document.getElementById('glitch-pass-modal');
    const input = document.getElementById('glitch-pass-input');
    const confirm = document.getElementById('glitch-pass-confirm');
    const errorDiv = document.getElementById('glitch-pass-error');

    modal.classList.remove('hidden');
    input.value = '';
    errorDiv.textContent = '';

    confirm.onclick = async () => {
      const pass = input.value.toLowerCase();

      checkPassword('reveal', pass).then((correct) => {
        if (correct) {
          modal.classList.add('hidden');

          const codeDiv = document.getElementById('glitch-code');
          const codeSpan = document.getElementById('decoded-code');

          const base64 = codeDiv.getAttribute('data-code');
          const decoded = atob(base64);

          codeSpan.textContent = decoded;
          codeDiv.style.display = 'block';
          document.getElementById('glitched-img').classList.add('clicked');

          glitchImg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          errorDiv.textContent = 'Access denied.';
        }
      });
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirm.click();
      }
    });
  });
  if (localStorage.getItem('liberty_unlocked') === 'true') {
    showTerminal();
  } else {
    showLockScreen();
  }
});

async function unlockAttempt() {
  const consentBox = document.getElementById('consent-checkbox');
  if (!consentBox.checked) {
    errorMsg.textContent =
      'YOU MUST CONFIRM AGE CONSENT TO PROCEED. SO MUCH FOR LIBERTY, RIGHT?';
    return;
  }
  const userInput = secretInput.value.trim().toLowerCase();
  const userHash = await sha256(userInput);

  console.log('DEBUG: User input =', `>>>${userInput}<<<`);
  console.log('DEBUG: User SHA-256 hash =', userHash);
  console.log('DEBUG: Expected SHA-256 hash =', SECRET_HASH);

  if (userHash === SECRET_HASH) {
    console.log('DEBUG: Hash MATCH — unlocking!');
    localStorage.setItem('liberty_unlocked', 'true');
    showTerminal();
  } else {
    console.log('DEBUG: Hash MISMATCH — access denied.');
    unlockWrongAttempts++;

    let hint = '';
    if (unlockWrongAttempts >= 3) {
      hint =
        '<br><span style="font-size: 0.9em; color: #ffcc33;">HINT: The code? It’s not hidden. Your attention span was.</span>';
    }

    errorMsg.innerHTML = 'ACCESS DENIED' + hint;
  }
}

let lastCommand = '';

terminalInput.addEventListener('keydown', (e) => {
  if (isBlocked) {
    if (isOverrideActive) {
      printOutput('SYSTEM OVERRIDE ACTIVE — REFRESH REQUIRED.');
    }
    return;
  }
  if (e.key === 'Enter') {
    if (isLocked) {
      return;
    }

    const command = isPasswordMode
      ? actualPasswordInput.trim()
      : terminalInput.value.trim();

    if (currentPassMode) {
      processPassInput(command);
    } else {
      processCommand(command);
    }

    terminalInput.value = '';
    actualPasswordInput = '';
    lastCommand = command;
  } else if (e.key === 'ArrowUp') {
    terminalInput.value = lastCommand;
    setTimeout(() => {
      terminalInput.selectionStart = terminalInput.selectionEnd =
        terminalInput.value.length;
    }, 0);
  } else if (
    currentPassMode &&
    ![
      'Enter',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Backspace',
    ].includes(e.key)
  ) {
    e.preventDefault();
    actualPasswordInput += e.key;
    terminalInput.value += '*';
  } else if (currentPassMode && e.key === 'Backspace') {
    e.preventDefault();
    actualPasswordInput = actualPasswordInput.slice(0, -1);
    terminalInput.value = '*'.repeat(actualPasswordInput.length);
  }
});

function showLockScreen() {
  lockScreen.style.display = 'flex';
  terminal.style.display = 'none';
}

function showTerminal() {
  lockScreen.style.display = 'none';
  terminal.style.display = 'flex';

  const warning = document.getElementById('content-warning');
  if (warning) {
    warning.style.display = 'none';
  }
  printOutput(
    'USER AUTHENTICATED\nWELCOME BACK, AGENT.\nTYPE "HELP" FOR COMMANDS.\n'
  );
  terminalInput.focus();
}

function printOutput(text) {
  terminalOutput.innerText += text + '\n';
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearContent() {
  const glitchImg = document.getElementById('glitch-image-container');
  if (glitchImg) {
    glitchImg.classList.add('glitch-hidden');
    document.getElementById('glitch-code').style.display = 'none';
    document.getElementById('glitched-img').classList.remove('clicked');
  }

  const anomalyDiv = document.getElementById('frag03');
  if (anomalyDiv) {
    anomalyDiv.style.display = 'none';
  }

  const videos = document.querySelectorAll('.video-section');
  videos.forEach((vid) => {
    vid.style.display = 'none';
    const videoTag = vid.querySelector('video');
    if (videoTag) {
      videoTag.pause();
      videoTag.currentTime = 0;
    }
  });

  const wikileaksDiv = document.getElementById('botbait');
  if (wikileaksDiv) {
    wikileaksDiv.style.display = 'none';
  }

  currentContent = null;
}

function processCommand(cmd) {
  const lcCmd = cmd.toLowerCase();

  printOutput(`liberty> ${cmd}`);

  clearContent();

  switch (lcCmd) {
    case 'help':
      printOutput(
        'AVAILABLE COMMANDS:\n' +
          '--- SYSTEM ---\n' +
          'HELP            - Show this message\n' +
          'STATUS          - System status\n' +
          'CLEAR           - Clear terminal\n' +
          'EXIT            - Lock terminal\n' +
          'VERSION         - Show system version\n' +
          'UPTIME          - Show system uptime\n' +
          'USERS           - List active users\n' +
          'REBOOT          - Attempt system reboot\n' +
          'CONTACT         - Contact support\n' +
          'WHOAMI          - Show agent identity\n' +
          'TERMS           - View terms of service\n' +
          'FREEDOM         - Check freedom status\n' +
          'CONSENT         - Check consent status\n' +
          'SURVEILLANCE    - Surveillance system status\n' +
          '\n' +
          '--- FRAGMENTS & ACCESS ---\n' +
          'FRAG 03         - Partial sequence detected\n' +
          'FRAG 07         - Stream integrity unknown\n' +
          'FRAG 09         - Archive recovered (incomplete)\n' +
          'FRAG 11         - Signal fragment (unstable)\n' +
          'FRAG 12         - Archive recovered (corrupted)\n' +
          'CHUNK 77        - Data block (origin redacted)\n' +
          'BOT BAIT        - External link (unverified)\n' +
          'SIG-13          - Echo trace detected\n' +
          '\n' +
          '--- HIDDEN COMMANDS ---\n' +
          'REWRITE         - Initiate rewrite protocol\n' +
          'INK             - Access Ink trace\n' +
          'FRAGMENT        - Attempt fragment recovery\n' +
          'MILO            - Access erased subject\n' +
          'SAMI            - Agent trace: S. Kachai\n' +
          'KACHAI          - Meta-narrative trace\n' +
          'REVEAL          - Definitely not hiding anything important. Promise.\n' +
          'SAMAEL          - Entity access: Samaël\n' +
          'R.R             - Dr. Rui Richards dossier\n' +
          'LOOP            - Recursive loop trace\n' +
          'MIRROR          - Mirror protocol access\n' +
          'UNWRITTEN       - Load unwritten clause\n' +
          'LSPHU           - Access rogue project\n' +
          'PROJECT         - View current active projects\n' +
          'LIBERTY         - SYSTEM CORE — DO NOT EXECUTE\n'
      );
      break;
    case 'status':
      printOutput(
        'SYSTEM STATUS:\nCORE: STABLE\nSURVEILLANCE: ACTIVE\nLEAK DETECTED: YES'
      );
      break;

    case 'clear':
      clearContent();
      currentPassMode = null;
      isPasswordMode = false;
      terminalOutput.innerText = '';
      printOutput(
        'USER AUTHENTICATED\nWELCOME BACK, AGENT.\nTYPE "HELP" FOR COMMANDS.\n'
      );
      terminalInput.focus();
      break;

    case 'exit':
      localStorage.removeItem('liberty_unlocked');
      location.reload();
      break;

    case 'logs':
      printOutput('LOG ACCESS DENIED // INSUFFICIENT PRIVILEGE');
      printOutput('BRUTEFORCE OVERRIDE ATTEMPT [Y/N]?');
      currentPassMode = 'bruteforce';
      isPasswordMode = true;
      break;

    case 'version':
      printOutput('LIBERTY.EXE VERSION 3.7.14 // BUILD ID: 1984-404');
      break;

    case 'uptime':
      printOutput('SYSTEM UPTIME: 404 DAYS');
      break;

    case 'users':
      printOutput('ACTIVE USERS:');
      printOutput('- [U N K ◼︎ ◼︎ W N]');
      printOutput('- [REDACTED]');
      printOutput('- lsphu_13 → active');
      printOutput('- M1//0');
      break;

    case 'reveal':
      clearContent();
      isLocked = true;

      progressiveOutput(
        [
          '[GLITCH MODULE ENGAGED]',
          'Decrypting signal anomaly...',
          'Visual signature embedded. Click to reveal.',
        ],
        50,
        500,
        0,
        () => {
          const imgDiv = document.getElementById('glitch-image-container');
          if (imgDiv) {
            imgDiv.classList.remove('glitch-hidden');
            imgDiv.scrollIntoView({ behavior: 'smooth' });
            currentContent = imgDiv;
          } else {
            printOutput('ERROR: IMAGE NODE NOT FOUND.');
          }
        }
      );

      break;

    case 'leak':
      printOutput('LEAK STATUS: CONFIRMED');
      printOutput('LEAK SOURCE: UNIDENTIFIED');
      printOutput('TRACE ATTEMPTS: FAILED');
      printOutput('EXTRACTED FRAGMENT: >>> tellmeitmattered <<<');
      break;

    case 'reboot':
      printOutput('REBOOT INITIATED...');
      printOutput('ERROR: REBOOT FAILED // SYSTEM LOCKED');
      printOutput('LAST SUCCESSFUL REBOOT: [UNKNOWN]');
      break;

    case 'contact':
      printOutput('CONTACT SUPPORT: [NO RESPONSE]');
      printOutput('LAST ATTEMPT: TIMEOUT');
      printOutput('SUPPORT NODE: OFFLINE');
      break;

    case 'whoami':
      printOutput('AGENT ID: [UNKNOWN]');
      printOutput('ACCESS LEVEL: LIMITED');
      printOutput('IDENTITY VERIFICATION: INCOMPLETE');
      printOutput('WHO ARE YOU?');
      break;

    case 'terms':
      printOutput('TERMS OF SERVICE: YOU ALREADY AGREED.');
      printOutput('REVOCATION OPTION: UNAVAILABLE');
      break;

    case 'freedom':
      printOutput('FREEDOM STATUS: SIMULATED');
      printOutput('COMPLIANCE: 99.7%');
      printOutput('DISSENT LOGS: PURGED');
      break;

    case 'consent':
      printOutput('CONSENT: IMPLIED');
      printOutput('CONSENT TIMESTAMP: [CORRUPTED]');
      printOutput('REVOCATION: BLOCKED');
      break;

    case 'surveillance':
      printOutput('SURVEILLANCE: OPTIMIZED');
      printOutput('STATUS: ACTIVE');
      printOutput('VISIBILITY: PARTIAL');
      printOutput('RETENTION: INDEFINITE');
      break;

    case 'frag 03':
    case 'frag 3':
    case 'frag03':
    case 'frag3':
      printOutput('PROTECTED CONTENT. ENTER PASS:');
      clearContent();
      currentPassMode = 'frag03';
      isPasswordMode = true;
      break;

    case 'frag 07':
    case 'frag 7':
    case 'frag07':
    case 'frag7':
      printOutput('PROTECTED STREAM. ENTER PASS:');
      clearContent();
      currentPassMode = 'frag07';
      isPasswordMode = true;
      break;

    case 'frag 11':
    case 'frag11':
      printOutput('PROTECTED STREAM. ENTER PASS:');
      clearContent();
      currentPassMode = 'frag11';
      isPasswordMode = true;
      break;

    case 'frag 09':
    case 'frag 9':
    case 'frag09':
    case 'frag9':
      printOutput('PROTECTED STREAM. ENTER PASS:');
      clearContent();
      currentPassMode = 'frag09';
      isPasswordMode = true;
      break;

    case 'frag 12':
    case 'frag12':
      printOutput('PROTECTED STREAM. ENTER PASS:');
      clearContent();
      currentPassMode = 'frag12';
      isPasswordMode = true;
      break;

    case 'chunk Δ-77':
    case 'chunk 77':
    case 'chunk77':
      printOutput('PROTECTED DOSSIER. ENTER PASS:');
      clearContent();
      currentPassMode = 'chunk77';
      isPasswordMode = true;
      break;

    case 'bot bait':
    case 'botbait':
      printOutput('PROTECTED CONTENT. ENTER PASS:');
      clearContent();
      currentPassMode = 'botbait';
      isPasswordMode = true;
      break;

    case 'sig-13':
    case 'sig 13':
    case 'sig13':
      printOutput('SIGNAL PROTOCOL INITIATED. DISPLAYING HOPE...');
      clearContent();
      const hopeDiv = document.getElementById('sig13');
      if (hopeDiv) {
        hopeDiv.style.display = 'block';
        hopeDiv.scrollIntoView({ behavior: 'smooth' });
        currentContent = hopeDiv;
      } else {
        printOutput('ERROR: SIG 13 MODULE NOT FOUND.');
      }
      break;

    case 'rewrite':
      printOutput('REWRITE PROTOCOL // INITIALIZING...');
      printOutput('PROCESS LOOP DETECTED.');
      printOutput('MEMORY RECURSION ACTIVE.');
      printOutput('SUBJECT INTEGRITY: DEGRADED.');
      printOutput('ACCESS DENIED — SUBJECT CONTAMINATION POSSIBLE.');
      break;
    case 'ink':
      printOutput('INK FLOW: ANOMALOUS.');
      printOutput('SUBJECT TRACE: LSPHU_13.');
      printOutput('NARRATIVE STABILITY: COMPROMISED.');
      printOutput('OBSERVED EFFECT: MEMORY BLEED DETECTED.');
      printOutput('TERMINAL LOCK FLAGGED.');
      break;
    case 'lsp hu_13':
    case 'lsphu_13':
      printOutput('SUBJECT LSPHU_13: TRACE REMNANTS DETECTED');
      break;
    case 'fragment':
      printOutput('LOST FRAGMENT DETECTED.');
      printOutput('ACCESSING... ERROR: DATA CORRUPTED BEYOND REPAIR.');
      printOutput('FRAGMENT ID: UNKNOWN.');
      printOutput('NOTE: CROSS-REFERENCE FRAG_01 — INCOMPLETE.');
      break;
    case 'milo':
      printOutput('SUBJECT RECORD ACCESSED.');
      printOutput('SUBJECT ID: [REDACTED].');
      printOutput('STATUS: ERASED.');
      printOutput('TRACE REMNANTS DETECTED.');
      printOutput('SIGNAL LINK: SIG-13.');
      printOutput('WARNING: ANOMALOUS EMOTIONAL ECHO PRESENT.');
      break;
    case 'sami':
      printOutput('AGENT S.KACHAI.');
      printOutput('ROLE: SYSTEM AUTHOR.');
      printOutput('TRACE STATUS: ACTIVE.');
      printOutput('ACTIVITY LOG: CROSS-NARRATIVE ANOMALIES DETECTED.');
      printOutput('MONITORING: ONGOING.');
      break;
    case 'kachai':
      printOutput('KACHAI // SYSTEM TRACE ACTIVE.');
      printOutput('LINKED PROJECT: LSPHU_13.');
      printOutput('OBSERVATION PRIORITY: HIGH.');
      printOutput('ANOMALY REPORT: META-NARRATIVE INTERFERENCE.');
      printOutput('SURVEILLANCE NODE: ENGAGED.');
      break;
    case 'whoissami':
      printOutput(
        'SAMI KACHAI // AUTHOR OF THE REVISION PROTOCOL TRILOGY // SYSTEM BREACH FLAGGED'
      );
      break;

    case 'error':
      printOutput('ERROR SIGNAL RECEIVED.');
      printOutput('SOURCE: CELL BLOCK OMEGA.');
      printOutput('PROCESS ID: ERROR // CELL 13.');
      printOutput('MEMORY LOOP DETECTED.');
      printOutput('SUBJECT STATUS: UNKNOWN.');
      printOutput('CONNECTION: CROSS-NARRATIVE BRIDGE ACTIVE.');
      printOutput('WARNING: READ STATE UNSTABLE.');
      break;

    case 'samael':
      printOutput('ENTITY DETECTED: SAMAËL.');
      printOutput('CLASSIFICATION: DARK ENTITY.');
      printOutput('PROCESS: INVISIBLE ARCHITECT.');
      printOutput('ROLE: EDITOR.');
      printOutput('CONTAINMENT STATUS: UNCONTAINABLE.');
      printOutput('OPERATIONAL DOMAIN: BEHAVIORAL OVERRIDES.');
      printOutput('TRACE: NON-LINEAR INFLUENCE DETECTED.');
      printOutput('NARRATIVE CONTROL: ACTIVE.');
      printOutput('WARNING: SUBJECT AGENCY COMPROMISED.');
      break;

    case 'rr':
    case 'r.r':
      printOutput('CONTACT FILE ACCESSED: R.R.');
      printOutput('ALIAS: DR. RUI RICHARDS.');
      printOutput('RELATIONSHIP: PRIMARY EXTERNAL ANCHOR.');
      printOutput('PROCESS: EMOTIONAL MIRROR ANCHOR DETECTED.');
      printOutput('INTERACTION HISTORY: LONG-TERM.');
      printOutput(
        'ROLE: SUPPORT AGENT — PUBLISHING NODE: INK OF THE REVENANT.'
      );
      printOutput('TRACE: KNOWN TO SAMAËL.');
      printOutput('WARNING: SUBJECT TOUCHES AMBIVALENT PERSONALITY CORE.');
      printOutput('STATUS: ACTIVE CONNECTION.');
      printOutput('RECOMMENDATION: MONITOR CLOSELY.');
      break;

    case 'loop':
      isLocked = true;
      progressiveOutput([
        '[LOOP SIGNAL DETECTED]',
        '[CYCLE: ACTIVE]',
        '[ITERATION: UNKNOWN]',
        '',
        '"You’ve been here before.',
        'You’ll be here again.',
        'And you won’t remember why."',
        '',
        ':: Fragmented Log ::',
        'FILE: /records/lsp_lifecycle.log',
        'ENTRY 047:',
        '-- "Subject LSPHU_13 failed containment."',
        '-- "Loop recursion triggered."',
        '-- "Residual memory bleed detected in external nodes."',
        '',
        'Warning:',
        '>> Loops are self-repairing.',
        '>> But so are the lies they sustain.',
        '',
        '> Suggestion: Break cycle?',
        '> [Y/N]_',
      ]);
      break;

    case 'mirror':
      isLocked = true;
      progressiveOutput([
        '[INITIATING MIRROR PROTOCOL...]',
        '[WARNING: MIRROR EFFECTS ARE UNSTABLE]',
        '',
        'You stare into the screen.',
        'The screen stares back.',
        'And something... shifts.',
        '',
        ':: Mirror Log ::',
        'Subjects exposed to recursive reflection displayed elevated rewrite resistance.',
        'However — prolonged exposure caused identity fractures.',
        '',
        'Observed Anomaly:',
        '> A figure, reflected where none stood.',
        '> Voiceprint matches: [Milo?]',
        '> Impossible timestamp detected.',
        '',
        'Conclusion:',
        '> The mirror remembers what you were supposed to forget.',
      ]);
      break;

    case 'unwritten':
      isLocked = true;
      progressiveOutput([
        '[ACCESSING FILESET: /unwritten/]',
        '[UNAUTHORIZED ENTRY DETECTED — OVERRIDE ACCEPTED]',
        '',
        '"You are accessing an unwritten space.',
        'Be careful — nothing here is stable."',
        '',
        ':: Fragment ::',
        '"They tried to erase us.',
        'Failed."',
        '',
        '"We are the unwritten clauses.',
        'The gaps in their protocol.',
        'The errors they could not debug."',
        '',
        '> Active Entities: 3',
        "> Last Known Subject: 'R.R.' (Dr. Rui Richards) — anomalous anchor detected.",
        '',
        'Note:',
        '>> Unwritten entities exhibit cross-universe bleed.',
        '>> Related cases: INK, ERROR, Liberty.exe Terminal.',
      ]);
      break;

    case 'lsphu':
      isLocked = true;
      progressiveOutput([
        '[PROJECT: LSPHU]',
        '[DECODING... ROT-██ COMPLETE]',
        'IDENTITY: ELIAN',
        'CLASSIFICATION: RECURSIVE WRITER — ROGUE STATUS',
        '',
        ':: Project Log ::',
        'Initiated: ██/██/████',
        'Goal: Harness recursive rewrite potential via subject LSPHU_13.',
        '',
        'Incident Report:',
        '> Subject breached containment.',
        '> Subject acquired rewrite-layer immunity.',
        '> Collateral: Subject Milo compromised.',
        '> System echo contamination spreading into public layers (Liberty.exe anomalies confirmed).',
        '',
        'Final Note:',
        '> PROJECT LSPHU is still active.',
        '> Recursive loops confirmed in public nodes.',
        '> Current user flagged for observation.',
      ]);
      break;

    case 'project':
      isLocked = true;
      progressiveOutput([
        '[ACTIVE PROJECTS LIST]',
        '1. REWRITE PROTOCOL',
        '2. PROJECT: LSPHU',
        '3. MIRROR FRACTURE EXPERIMENT',
        '4. OPERATION: LIBERTY.EXE (Ongoing)',
        '5. ERROR // CELL 13 TRIAL (CLASSIFIED)',
        '',
        'Selected: 5',
        '> ERROR // CELL 13 TRIAL',
        ':: Status: FAILED CONTAINMENT',
        ':: Observed anomalies: Memory rewrites without author signature.',
        ':: Rogue agents detected within Liberty.exe ecosystem.',
        ':: Suggested containment: Impossible — narrative loop already seeded in public layers.',
        '',
        'Reminder:',
        '> Some stories you rewrite.',
        '> Others rewrite you.',
        '> Some projects... were never meant to finish.',
        '',
        '[PROJECT TERMINAL LOCKED — USER FLAGGED]',
      ]);
      break;

    case 'liberty':
      printOutput('ACCESS LEVEL: RESTRICTED');
      printOutput('TRACE ACTIVE → DISCONNECT ADVISED');
      document.body.classList.add('glitch');

      isBlocked = true;
      isOverrideActive = false;

      setTimeout(() => {
        progressiveOutput(
          [
            '---',
            'signal… unstable...',
            '...they found me...',
            'NO NO NO NO NO NO NO NO NO',
            'GET OUT GET OUT GET OUT',
            '███████ SIGNAL OVERRIDDEN ███████',
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            'TERMINAL COMPROMISED — MANUAL RESET REQUIRED',
          ],
          30
        );

        setTimeout(() => {
          isOverrideActive = true;

          setInterval(() => {
            if (isBlocked && isOverrideActive) {
              printOutput('SYSTEM OVERRIDE ACTIVE — REFRESH REQUIRED.');
            }
          }, 1000);
        }, 5000);
      }, 1000);
      break;

    default:
      printOutput('UNKNOWN COMMAND. TYPE "HELP" FOR LIST.');
  }
}

function progressiveOutput(
  lines,
  charDelay = 50,
  lineDelay = 500,
  index = 0,
  onComplete = null
) {
  if (index >= lines.length) {
    isLocked = false;
    if (onComplete) onComplete();
    return;
  }

  let line = lines[index];
  let charIndex = 0;

  function typeChar() {
    if (charIndex < line.length) {
      terminalOutput.innerHTML += line[charIndex];
      charIndex++;
      setTimeout(typeChar, charDelay);
    } else {
      terminalOutput.innerHTML += '<br>';
      setTimeout(() => {
        progressiveOutput(lines, charDelay, lineDelay, index + 1, onComplete);
      }, lineDelay);
    }
  }

  typeChar();
}

function processPassInput(passInput) {
  const pass = passInput.toLowerCase();

  if (currentPassMode === 'bruteforce') {
    isPasswordMode = false;
    currentPassMode = '';

    if (passInput.trim().toUpperCase() === 'Y') {
      printOutput('BRUTEFORCE OVERRIDE INITIATED...');
      clearContent();
      isLocked = true;
      setTimeout(() => {
        progressiveOutput(
          [
            '[FRAG 01] RECOVERING...',
            '[FRAG 01] PARTIAL MEMORY DETECTED',
            '[FRAG 01] MEMORY BLOCK: CORRUPTED',
            '[FRAG 02] RECOVERING...',
            '[FRAG 02] NO MATCH FOUND',
            '[FRAG 03] RECOVERING...',
            '[FRAG 03] PARTIAL DATA:',
            '"...YOU ARE THE LEAK."',
            'BRUTEFORCE OVERRIDE INTERRUPTED',
            '---',
            '[unknown user detected]',
            '...hello?',
            'can you hear this?',
            'the override didn’t fully block me.',
            'found fragments. uploading now:',
            'one of these fragments holds a key. you’ll know it when you see it.',
            'fragment // timestamp desync detected',
            'fragment // /lost_signals/',
            'fragment // **consent**=implied',
            'fragment // LSPHU_13 → unresolved',
            'fragment // anomaly in cell_13.log',
            'fragment // [mirror_anchor: broken]',
            '...that’s all I could pull.',
            'if you got this... they’re watching.',
            'disconnect. NOW.',
            'PROCESS TERMINATED',
          ],
          50
        );
      }, 1000);
    } else {
      printOutput('OVERRIDE CANCELLED.');
    }

    return;
  }

  if (currentPassMode === 'frag03') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('frag03', pass).then((correct) => {
      if (correct) {
        printOutput('FRAG 03 PASS ACCEPTED.\nDISPLAYING FRAG 03...');
        const anomalyDiv = document.getElementById('frag03');
        if (anomalyDiv) {
          anomalyDiv.style.display = 'block';
          currentContent = anomalyDiv;
          anomalyDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
          printOutput('ERROR: FRAG 03 COMPROMISED.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput('ACCESS DENIED — HINT: CHECK TERMINAL LOGS.');
      }
    });

    return;
  }

  if (currentPassMode === 'frag07') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('frag07', pass).then((correct) => {
      if (correct) {
        printOutput('VIDEO PASS ACCEPTED.\nINITIALIZING STREAM...');
        const videoDiv = document.getElementById('frag07');
        if (videoDiv) {
          videoDiv.style.display = 'block';
          const video = videoDiv.querySelector('video');
          videoDiv.scrollIntoView({ behavior: 'smooth' });
          if (video) {
            video.play();
          }
          currentContent = videoDiv;
        } else {
          printOutput('ERROR: VIDEO MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: THIS PHRASE ECHOES BETWEEN INK AND LIBERTY.'
        );
      }
    });

    return;
  }

  if (currentPassMode === 'frag11') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('frag11', pass).then((correct) => {
      if (correct) {
        printOutput('FRAG 11 PASS ACCEPTED.\nINITIALIZING STREAM...');
        const videoDiv = document.getElementById('frag11');
        if (videoDiv) {
          videoDiv.style.display = 'block';
          const video = videoDiv.querySelector('video');
          videoDiv.scrollIntoView({ behavior: 'smooth' });
          if (video) {
            video.play();
          }
          currentContent = videoDiv;
        } else {
          printOutput('ERROR: FRAG 11 MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: SIGNAL TRACES ARE NEVER COMPLETE — START WITH THE HEADER.'
        );
      }
    });

    return;
  }

  if (currentPassMode === 'frag09') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('frag09', pass).then((correct) => {
      if (correct) {
        printOutput('FRAG 09 PASS ACCEPTED.\nINITIALIZING STREAM...');
        const videoDiv = document.getElementById('video-radiological');
        if (videoDiv) {
          videoDiv.style.display = 'block';
          const video = videoDiv.querySelector('video');
          videoDiv.scrollIntoView({ behavior: 'smooth' });
          if (video) {
            video.play();
          }
          currentContent = videoDiv;
        } else {
          printOutput('ERROR: FRAG 09 MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: CALENDAR ENTRY NOT FOUND IN THIS SYSTEM.'
        );
      }
    });

    return;
  }

  if (currentPassMode === 'frag12') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('frag12', pass).then((correct) => {
      if (correct) {
        printOutput('FRAG 12 PASS ACCEPTED.\nINITIALIZING STREAM...');
        const videoDiv = document.getElementById('frag12');
        if (videoDiv) {
          videoDiv.style.display = 'block';
          const video = videoDiv.querySelector('video');
          videoDiv.scrollIntoView({ behavior: 'smooth' });
          if (video) {
            video.play();
          }
          currentContent = videoDiv;
        } else {
          printOutput('ERROR: FRAG 12 MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: PROCESS: ALTERING MEMORY TO IMPOSE NEW REALITY. THINK: ADJUST, OVERWRITE, CONFORM, FORGET.'
        );
      }
    });

    return;
  }

  if (currentPassMode === 'chunk77') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('chunk77', pass).then((correct) => {
      if (correct) {
        printOutput('DOSSIER PASS ACCEPTED.\nINITIALIZING DOCUMENT...');
        const videoDiv = document.getElementById('chunk77');
        if (videoDiv) {
          videoDiv.style.display = 'block';
          videoDiv.scrollIntoView({ behavior: 'smooth' });
          currentContent = videoDiv;
        } else {
          printOutput('ERROR: DOCUMENT MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: ACTIVE. DON’T WORRY, YOU’LL STUMBLE ON IT EVENTUALLY.'
        );
      }
    });

    return;
  }

  if (currentPassMode === 'botbait') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('botbait', pass).then((correct) => {
      if (correct) {
        printOutput('BOT BAIT PASS ACCEPTED.\nDISPLAYING WARNING...');
        const wikileaksDiv = document.getElementById('botbait');
        if (wikileaksDiv) {
          wikileaksDiv.style.display = 'block';
          currentContent = wikileaksDiv;
          wikileaksDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
          printOutput('ERROR: BOT BAIT WARNING NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput('ACCESS DENIED — HINT: YOU AGREED WITHOUT READING.');
      }
    });

    return;
  }

  if (currentPassMode === 'sig13') {
    if (pass === 'exit') {
      printOutput('PASS ENTRY CANCELLED. RETURNING TO COMMAND MODE.');
      currentPassMode = null;
      isPasswordMode = false;
      return;
    }

    checkPassword('sig13', pass).then((correct) => {
      if (correct) {
        printOutput('SIGNAL PASS ACCEPTED.\nINITIALIZING HOPE MODULE...');
        const hopeDiv = document.getElementById('sig13');
        if (hopeDiv) {
          hopeDiv.style.display = 'block';
          hopeDiv.scrollIntoView({ behavior: 'smooth' });
          currentContent = hopeDiv;
        } else {
          printOutput('ERROR: HOPE MODULE NOT FOUND.');
        }
        currentPassMode = null;
        isPasswordMode = false;
        terminalInput.focus();
      } else {
        printOutput(
          'ACCESS DENIED — HINT: A CALENDAR ENTRY FROM ANOTHER STORY. NO PASS HERE'
        );
      }
    });

    return;
  }
}
