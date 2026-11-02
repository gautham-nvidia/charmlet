# Charmlet privacy

Updated 2026-11-02.

Charmlet's extension runs locally. It does not send your source code, focus notes, garden progress or imported artwork to a Charmlet server. It does not include analytics, advertising or an account requirement.

## Data on your device

The extension saves your chosen charm, appearance and motion preferences, message preferences, optional focus intention, timer state, reminder settings, watering dates and earned flowers in your editor's extension storage. Imported charm packs are copied to that storage so they keep working offline and survive extension updates.

Charmlet reads the pack file you explicitly choose to import. It does not scan workspace files or send editor contents to an AI model. Its built-in facts, trivia, motivational messages and artwork are installed resources. AI-generated review artwork was prepared during development; displaying it does not make an AI request.

Storage is local, not a cross-device sync service. Your operating system, editor profile backup or device backup may copy these files according to your own settings. Treat optional focus notes and personal-photo packs as personal data.

## Network activity

Choosing **Read source** opens the cited website in your normal browser. Downloading the extension or extra artwork visits the host or extension store you selected. Those services have their own privacy policies. Editor-provided update checks and telemetry are controlled by the editor, not by Charmlet.

Store/detail pages and README screenshots may load images hosted on GitHub. The running Charmlet view uses its installed or imported artwork and does not need those listing images.

The optional website Photo Studio is separate and unavailable by default. Its prepared workflow processes a selected photo in browser memory; only licence/session requests reach its server. A downloaded personal-photo pack contains the image and name you selected, so sharing the pack shares that content. Live merchant access has not been enabled.

## Removing data

Use **Charmlet: Remove Charm Pack** to remove an imported pack. **Reset Charm** resets appearance; it does not erase garden progress.

To remove all extension data, first back up any packs or progress you want to keep, close the editor, and remove only Charmlet's `gautham-nvidia.charmlet` directory from that editor profile's `User/globalStorage` folder. Editor profiles and forks can use different locations. Uninstalling an extension may leave its saved storage behind.

The standalone desktop beta uses its own storage and is independent of the IDE extension. Removing extension data does not remove desktop progress.

## Questions

[Open a Charmlet issue](https://github.com/gautham-nvidia/charmlet/issues) for privacy questions. Do not attach private photos, licence keys, focus notes, credentials or workspace contents to a public issue.
