# 📞 Call Tracking State Machine Architecture
*Technical & Behavioral Breakdown*

---

## 🔍 1. End-to-End Flow

### When a call is initiated (Manual & IVR)
The user taps "Call". Before the dialer opens or the IVR API is pinged, the system instantly constructs a `CallState` object (containing `leadId`, `startTimestamp`, `type`, etc.) and writes it to `AsyncStorage` as `@crm_call_state` with the status `CALL_IN_PROGRESS`. This ensures the call is tracked before anything can fail.

### During the call (long calls & background usage)
The user switches to the dialer or puts the CRM app in the background. If the call lasts 45 minutes, nothing happens. The CRM app does not use fragile countdown timers. The user can seamlessly toggle between WhatsApp, their dialer, and the CRM app safely. 

### When the app is resumed
Every time Android brings the app to the foreground, `evaluateState()` is triggered via an `AppState` listener. The system checks `AsyncStorage` and recognizes the `CALL_IN_PROGRESS` status. It then silently checks the Android OS Call Logs to see if a log matching the specific `startTimestamp` exists yet. If it doesn't (because the call is still happening), the system silently halts and lets the user multitask.

### When the call is completed
Once the user hangs up, Android writes to the native OS Call Log. The next time the CRM app foregrounds, `evaluateState()` runs, finds the matching log, and strictly upgrades the state from `CALL_IN_PROGRESS` to `CALL_COMPLETED_PENDING_FEEDBACK`.

### When feedback is submitted or skipped
The Feedback Modal violently traps the screen.
- **On Submit (Success):** The system submits to the API, natively logs the history, blows away `@crm_call_state`, and resets to `IDLE`.
- **On API Failure:** The system throws an error and allows the user to invoke **Skip for Now**, which packages their feedback into an offline queue and forcefully resets the system state to `IDLE`, unblocking them completely.

---

## 🚦 2. Strict State Transitions

Currently, the exact state of the Call Engine is dictated by three explicit enum definitions:

1. **`IDLE`**
   - *Meaning:* No ongoing trackers.
   - *Transition:* Tapping a phone number upgrades the system abruptly to `CALL_IN_PROGRESS`.

2. **`CALL_IN_PROGRESS`**
   - *Meaning:* System is tracking a call, but lacks definitive completion data yet.
   - *Transition to Completed:* Triggered *autonomously* if the OS generates a Call Log or the WebSocket delivers a matched IVR payload. 

3. **`CALL_COMPLETED_PENDING_FEEDBACK`**
   - *Meaning:* Hard proof of completion exists. Business rules dictate the user must attach notes.
   - *Transition to Idle:* Handled purely by the user actively submitting the API successfully or utilizing the strict API Failure Bypass loop.

---

## 🖥 3. User Experience Behavior

- **Multitasking Freedoms:** While in `CALL_IN_PROGRESS`, the user experiences absolute zero friction. They can browse Leads, pull up notes, and edit contact infos.
- **The "Gatekeeper" Block:** The *only* time `CALL_IN_PROGRESS` causes UI friction is if the user attempts to tap "Call" on a **new** lead. The Gatekeeper intercepts this action natively, warning them that their previous call lacks resolution.
- **Enforced UX (`CALL_COMPLETED_PENDING_FEEDBACK`):** The app permanently overlays the Feedback modal. Even if they close the app and restart it, the startup sweep instantly summons the modal. They cannot utilize the CRM without submitting it. 

---

## 🛡 4. Edge Case Handling

- **App Backgrounding/Crashing/Killed:** Because no logic relies on RAM/Memory or `setTimeout`, if the phone forcibly shuts down the CRM app entirely to save RAM during a Call, booting the app the next day immediately extracts `CALL_IN_PROGRESS` from the hard drive and attempts to resolve it.
- **20+ Minute Long Calls:** Solved implicitly. There are no timers. `evaluateState()` just checks the log every time the app opens. If the log isn't there, it patiently waits.
- **Missed Socket Events (IVR):** If the websocket webhook drops, the app assumes it's `CALL_IN_PROGRESS` implicitly. When the user taps a new Call, the Gatekeeper catches the stranded IVR tracker and delegates the decision to the user: *"Did this complete?"*
- **User Cancelling Dialer:** They abandon the dial call. No log gets created. The Gatekeeper catches it on their next CRM action and provides a distinct *"Call was cancelled (Clear State)"* button.

---

## 🔧 5. Failure Handling Logic

If the `callLogsApi` crashes (e.g., 500 Server Error):
1. The `handleSaveFeedback` function violently catches the fault and prevents the UI layer from blindly resetting to `IDLE` (preventing data loss).
2. It prompts the user via Android Alert.
3. If they select **Skip for Now**, the exact state of the form (Stage, Outcome, Remarks) is serialized into an Array housed inside `@offline_feedbacks`.
4. The system is then manually nuked down to `IDLE` (`setCallState(null)`).
5. Result: The user is fundamentally unblocked from utilizing the pipeline while their data is locally secured.

---

## 🏆 6. Advantages of This Architecture

- **Total Determinism:** Reactive/Timer systems cause chaotic race conditions when users behave unpredictably. A State Machine ensures "If X happens, guarantee Y". 
- **OS Immune:** Android aggressive-hibernation mechanics literally cannot break this.
- **UX Empathy:** Instead of strictly locking down the user when the API fails, it prioritizes allowing the agent to continuously make calls and hit their quotas, handling discrepancies silently.

---

## ⚠️ 7. Potential Drawbacks / Limitations

- **Android Log Latencies:** Occasionally, Android devices delay writing the call to the global log file by 1-2 seconds after hanging up. If the user flips to the CRM app *blisteringly* fast, the `evaluateState()` sweep might miss it and stay in `CALL_IN_PROGRESS`.
- **User Integrity Required:** The Gatekeeper explicitly allows users to hit *"Call was cancelled"*. A lazy user can manipulate this to bypass adding mandatory Feedback for actual calls if they do it rapidly enough before the app automatically trips `evaluateState`.

---

## ⚙️ 8. Performance & Reliability Considerations

- **AsyncStorage as Source of Truth:** `AsyncStorage` reads are slightly slower than RAM reads (couple milliseconds). To protect performance, we read/write the state sparingly during exact architectural sweeps (`AppResume`, `Login`, `Gatekeeper`).
- **Idempotency Locks:** Because `AppState` resume and Socket incoming webhooks are highly unpredictable, the `evaluateState` wrapper utilizes `evalLock` references. This guarantees that if a Socket delivers data at the exact microsecond the user foregrounds the app, the system does not double-render or split-brain the transition logs.

---

## 🚀 9. Future Improvements

1. **Background Sync Engine:** A silent `setInterval` or React Native Background Fetch processor to seamlessly flush the `@offline_feedbacks` payload directly to the server without alerting the user.
2. **Dedicated Backend IVR Sync:** Adding an API route: `GET /ivr/active-calls/me`. On App Resume, this allows us to pull definitive proof if the IVR call completed rather than trusting local Memory sockets or user input on the Gatekeeper.
