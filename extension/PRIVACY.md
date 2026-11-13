# Charmlet privacy

Updated 2026-11-06.

Charmlet's extension runs locally. It does not send your source code, focus notes, garden progress or imported artwork to a Charmlet server. It does not include analytics, advertising or an account requirement.

## Data on your device

The extension saves your chosen charm, cord choices, appearance and motion preferences, message preferences, optional focus intention, timer state, small-win notes and counts, reminder settings, watering dates and earned flowers in your editor's extension storage. Cali's optional name, encouragement and focus-prompt preferences are stored there too. Imported charm packs are copied to that storage so they keep working offline and survive extension updates.

The in-app **Photo charms** panel processes the image you choose in memory. It saves only the cropped, framed 216-by-252-pixel PNG and the keepsake name you enter, in a local charm pack. The original file and its embedded metadata are not retained. No photo is uploaded. Closing the editor before saving discards the draft.

The live companions' gaze responds only to pointer coordinates in the Charmlet view. They do not use a camera, microphone, face recognition or a network service. Cali's text comes from installed messages and your local focus/win state; it is not sent to a chat service.

Charmlet reads the pack file you explicitly choose to import. It does not scan workspace files or send editor contents to an AI model. Its built-in facts, trivia, motivational messages and artwork are installed resources. AI-generated review artwork was prepared during development; displaying it does not make an AI request.

Storage is local, not a cross-device sync service. Your operating system, editor profile backup or device backup may copy these files according to your own settings. Treat optional focus notes and personal-photo packs as personal data.

## Network activity

The free starter does not require an activation account. If you import a trial or purchase access file, Charmlet verifies its signature and stores the grant through the editor's secret storage (or the desktop app's encrypted access store). The grant contains a keyed account identifier, access rights and issuance/trial dates, not your email address. A local clock record helps detect a trial clock moving backwards.

When an access service is configured, activated apps can send their signed grant to that service to refresh purchases, trial status and refunds. Photos, workspace files, focus notes, garden progress and Cali's optional name are not sent with that request. Signed purchases remain usable offline from their last confirmed access.

The website's download flow separately verifies an email address using Cloudflare/Turnstile and Brevo. Optional offers require a separate choice. Checkout is handled by Lemon Squeezy; payment-card details do not pass through the app or Charmlet's access service. The service retains a keyed email identity, trial deadline and ownership/consent records; its website privacy page describes the flow. Live delivery and checkout are disabled in this candidate's checked-in settings.

Choosing **Read source** opens the cited website in your normal browser. Downloading the extension or extra artwork visits the host or extension store you selected. Those services have their own privacy policies. Editor-provided update checks and telemetry are controlled by the editor, not by Charmlet.

Store/detail pages and README screenshots may load images hosted on GitHub. The running Charmlet view uses its installed or imported artwork and does not need those listing images.

The optional website Photo Studio is separate and unavailable by default. Its prepared workflow processes a selected photo in browser memory; only licence/session requests reach its server. A downloaded personal-photo pack contains the image and name you selected, so sharing the pack shares that content. Live merchant access has not been enabled.

## Removing data

Use **Charmlet: Remove Charm Pack** to remove an imported pack, or remove a keepsake in **Photo charms**. **Focus > Small wins > Clear history** removes saved win notes and counts. **Reset Charm** resets appearance; it does not erase garden progress.

Clear Cali's optional name under **Focus > Cali's encouragement**, then save preferences to remove it from the current local state. The same panel turns encouragement and focus prompts off.

Removing an app or its local preferences does not restart or erase the service's trial and purchase records. Use the contact on the published website's privacy page for requests about those records; do not post email links or activation files in a public issue.

To remove all extension data, first back up any packs or progress you want to keep, close the editor, and remove only Charmlet's `gautham-nvidia.charmlet` directory from that editor profile's `User/globalStorage` folder. Editor profiles and forks can use different locations. Uninstalling an extension may leave its saved storage behind.

The standalone desktop beta uses its own storage and is independent of the IDE extension. Removing extension data does not remove desktop progress.

## Questions

[Open a Charmlet issue](https://github.com/gautham-nvidia/charmlet/issues) for privacy questions. Do not attach private photos, licence keys, focus notes, credentials or workspace contents to a public issue.
