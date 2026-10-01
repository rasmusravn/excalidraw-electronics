# How the Excalidraw plugin handles several Templates

Research for [#41](https://github.com/rasmusravn/excalidraw-electronics/issues/41), part of [#38](https://github.com/rasmusravn/excalidraw-electronics/issues/38). Plugin version: **2.28.1** (Obsidian Excalidraw, `zsviczian/obsidian-excalidraw-plugin`).

## Sources

- **[S1]** Plugin source at tag `2.28.1` (commit `128a9ef`):
  - [`src/utils/fileUtils.ts` L549-L575](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2.28.1/src/utils/fileUtils.ts#L549-L575): `getListOfTemplateFiles`
  - [`src/core/managers/FileManager.ts` L140-L205](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2.28.1/src/core/managers/FileManager.ts#L140-L205): `createDrawing`, `getBlankDrawing`
  - [`src/shared/Dialogs/Prompt.ts` L1540-L1555](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2.28.1/src/shared/Dialogs/Prompt.ts#L1540-L1555): `templatePromt`; `linkPrompt` is in the same file
  - [`src/core/managers/CommandManager.ts`](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2.28.1/src/core/managers/CommandManager.ts): the "Create new drawing" commands (L590-L640), the folder context menu (L190-L200), annotate (L2010-L2016) and "Convert markdown note to Excalidraw Drawing" (L2522-L2550)
- **[S2]** The installed bundle `.obsidian/plugins/obsidian-excalidraw-plugin/main.js` (manifest version 2.28.1) in the test vault. Its minified code matches S1 line for line. It also holds the English UI strings, including the setting's help text (`TEMPLATE_NAME`, `TEMPLATE_DESC`) and the default `templateFilePath: "Excalidraw/Template.excalidraw"`.
- **[S3]** Test vault `~/personal-library`, read only: its `data.json` and four drawings created there after our installer wrote `Excalidraw/Template.excalidraw.md`.

## 1. How the template setting is resolved

`templateFilePath` is the only template setting. Every template lookup goes through `getListOfTemplateFiles` [S1 fileUtils.ts]:

```ts
const normalizedTemplatePath = normalizePath(plugin.settings.templateFilePath);
const template = plugin.app.vault.getAbstractFileByPath(normalizedTemplatePath);
if (template && template instanceof TFolder) {
  return plugin.app.vault.getFiles()
    .filter((f) => f.path.startsWith(template.path))
    .filter((f) => plugin.isExcalidrawFile(f))
    .sort((a, b) => a.path.localeCompare(b.path));
}
if (template && template instanceof TFile) {
  return [template];
}
const templateFile = plugin.app.metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
if (templateFile) { return [templateFile]; }
return null;
```

| Setting points at | Result |
|---|---|
| **A folder** | Every Excalidraw file whose path *starts with* the folder path, sorted by path. Subfolders count. Because it is a plain string prefix with no trailing `/`, a sibling folder such as `Excalidraw/Templates old/` also matches `Excalidraw/Templates`. Only files that `isExcalidrawFile` accepts are kept: `excalidraw-plugin` frontmatter, or a `.excalidraw` extension. |
| **An exact file** | That one file. The extension is not checked here. |
| **Neither** (e.g. the default `Excalidraw/Template.excalidraw` when only `Template.excalidraw.md` exists) | Obsidian link resolution (`getFirstLinkpathDest`), which adds `.md`. **This is how our installed file is found today:** the test vault keeps the default setting [S3], and the path resolves to `Excalidraw/Template.excalidraw.md`. |
| **Nothing resolves** | `null`, so the built-in blank drawing is used. |

An empty setting gives the same result. The settings UI marks the field optional [S2 `vaultPath:{kind:"file-or-folder",options:{optional:!0,extensions:["md","excalidraw"]}}`]. `normalizePath("")` gives either nothing or the vault root `/`. No file path starts with `/`, so the list is either `null` or empty, and both lead to the blank drawing with no prompt (see §2).

The setting's help text agrees [S2 `TEMPLATE_DESC`]: *"Full filepath or folderpath to the Excalidraw template … you may omit the .md file extension … **Template Folder:** You can also set a folder as your template. In this case you will be prompted which template to use when creating a new drawing."* The setting's name also warns that it is case sensitive.

## 2. How a template is chosen and used

`getBlankDrawing` [S1 FileManager.ts L176-L205]:

```ts
const templates = getListOfTemplateFiles(this.plugin);
if (templates) {
  const template = await templatePromt(templates, this.app);
  if (template && template instanceof TFile) {
    if ((template.extension == "md" && !this.settings.compatibilityMode) ||
        (template.extension == "excalidraw" && this.settings.compatibilityMode)) {
      const data = await this.app.vault.read(template);
      if (data) {
        return this.settings.matchTheme ? changeThemeOfExcalidrawMD(data) : data;
      }
    }
  }
}
// otherwise: built-in BLANK_DRAWING (with the default FRONTMATTER in .md mode)
```

`templatePromt` [S1 Prompt.ts L1540]:

```ts
if (files.length === 1) { return files[0]; }
return ((await linkPrompt(files.map((f) => `[[${f.path}|${f.name}]]`).join(" "), app,
  undefined, t("PROMPT_SELECT_TEMPLATE"))) ?? [null, null, null])[0];
```

What this means:

- **One candidate:** used silently, with no prompt.
- **Two or more candidates** (folder mode only): a suggester titled "Select a template" lists each file by name. There is no "remember my choice" and no default entry. The chooser appears on **every** creation.
- **Escape on the chooser does not cancel the creation.** `linkPrompt` returns `undefined`, `templatePromt` returns `null`, and the drawing is still created from the built-in blank. It is not created from any template.
- **No candidates** (empty folder): `linkPrompt("")` has nothing to show and returns `undefined`, so the built-in blank is used with no prompt.
- **The extension and the mode must match.** Outside compatibility mode only an `.md` template is used. A `.excalidraw` pick is ignored silently and the built-in blank is used.
  - **Pitfall:** if a legacy file `Excalidraw/Template.excalidraw` exists, the default setting matches it exactly, ahead of link resolution. Outside compatibility mode it is then rejected, so our `Template.excalidraw.md` is **silently shadowed**.
- **The template is copied verbatim.** `vault.read(template)` returns the whole file: frontmatter, any markdown above `# Excalidraw Data`, and the drawing. Only `matchTheme` can rewrite it, and only a `"theme": "light"/"dark"` entry. Our Template has no `theme` key, so it is copied unchanged.

## 3. Which commands use the template and prompt

`createDrawing(filename, folder?, initData?)` calls `getBlankDrawing()` whenever `initData` is not given [S1 FileManager.ts L140-L153]. So all of the following resolve the template and show the chooser when there are two or more candidates [S1 CommandManager.ts; strings from S2]:

- The commands `Create new drawing - IN AN ADJACENT WINDOW`, `… IN A NEW TAB`, `… IN THE CURRENT ACTIVE WINDOW` and `… IN A POPOUT WINDOW` (`excalidraw-autocreate*`)
- `Create new drawing - IN AN ADJACENT WINDOW - and embed into active document` (and the other embed variants)
- The ribbon icon (`actionRibbonClick`), and **New drawing** in the file explorer's folder context menu
- The "Create EX" button in the dialog for a new file from an unresolved link [S1 Prompt.ts L1281]
- `Convert markdown note to Excalidraw Drawing`, which merges the template into the note via `mergeMarkdownFiles` [S1 CommandManager.ts L2543]
- Annotate image, which calls `templatePromt` itself and passes `templatePath` to `ExcalidrawAutomate.create`. That function merges the template's frontmatter into the new file [S2 `t?.frontmatter&&e?.frontmatterKeys&&(i=mergeMarkdownFiles(t.frontmatter,i))`].
- Scripts can call `ea.create({templatePath})` or `ea.getListOfTemplateFiles()` themselves.

**Per-drawing choice is only possible in folder mode,** through the chooser. In file mode no command lets you pick a template. There is also no "new drawing from template X" command; the only way to target a specific template is an Excalidraw Automate script.

## 4. Can our Template live under its own name without being the default?

- **A file the setting doesn't point at (or sit under) is never used.** Nothing else in the plugin scans for templates. So our Template can sit at any path or name and stay dormant. It does nothing until the user points the setting at it, or at a folder that contains it.
- **To ship it alongside a user's own template**, the setting must point at a folder that holds both, e.g. `Excalidraw/Templates/`. The user then picks per drawing, at the cost of a chooser on every creation, and Escape gives a plain blank drawing.
- **Folder mode picks up every Excalidraw file under the folder,** including drawings saved there by accident, and sibling folders that share the prefix.
- **Today's install path depends on the user's setting:**
  - It works when the setting is the untouched default and no legacy `Excalidraw/Template.excalidraw` exists. Then our file *becomes* the template for every new drawing.
  - If the user has already set their own file or folder, our file is ignored. Unless their folder happens to contain `Excalidraw/`, in which case all their drawings in `Excalidraw/` turn into chooser entries too.

## 5. What the copied frontmatter marker breaks

**Confirmed:** `getBlankDrawing` copies the whole file. All four drawings created in the test vault after installing the Template contain `excalidraw-electronics-template: true` [S3].

- **The plugin is not affected.** It keeps unknown frontmatter keys and does not interpret them. The drawings open and save normally.
- **The marker stops identifying the Template.** In `src/cli.ts` the marker means "a file the Generator manages, which it may replace". Every drawing made from the Template now claims that.
  - **Today this is harmless, because the installer only checks one fixed path,** `Excalidraw/Template.excalidraw.md`, before overwriting it.
  - **Any future logic that finds the Template by its marker would be destructive.** That includes scanning a template folder, finding a renamed or moved Template, or uninstalling. It would treat every user drawing made from the Template as ours, and might overwrite or delete them.
- **In folder mode, marked drawings saved inside the template folder look exactly like our Template.** Neither the plugin nor the installer can tell them apart.
- **A user who edits our Template in place keeps the marker,** so the next `--install` overwrites their edits. This is existing behaviour, unrelated to the copying, but it is the same weakness of a marker-only claim.

## Implications for shipping our Template beside a user's own

1. **Never identify the Template by the marker alone.** Use the exact path plus the marker. Better still, compare the content with what we last installed, which also protects user edits.
2. **Never change `templateFilePath` without the user's consent.** With the default setting and no existing template, installing to `Excalidraw/Template.excalidraw.md` (today's behaviour) is fine. With a user's own file set, we should install under our own name and tell the user how to use it:
   - point the setting at it, or
   - make a template folder holding both files and accept the chooser.
3. **Detect the legacy `Excalidraw/Template.excalidraw` shadowing case** (outside compatibility mode) and warn about it.
4. **Optionally, keep the marker out of new drawings.** Drop it from the Template and recognise the Template by path and content hash instead. The plugin copies frontmatter verbatim and has no hook to strip keys, so any key we put in the Template ends up in every drawing.
