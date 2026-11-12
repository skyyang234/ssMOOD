# News

## Version Mapping

The table below shows the correspondence between the **running version** (the user-facing release number) and the underlying **codebase version** (the core implementation).
This mapping helps ensure reproducibility in research and makes it easier to track which codebase was used for a specific software release.

```markdown
| Running Version | Codebase Version | Release Date | Notes                |
| --------------- | ---------------- | ------------ | -------------------- |
| v2.0.0 (Now)    | v4.9.0           | 2026-11-08   | Latest release       |
| v1.1.1          | v4.8.0           | 2026-03-07   | Third release        |
| v1.1.0          | v4.7.0           | 2025-08-27   | Second release       |
| v1.0.0          | v4.6.0           | 2025-07-06   | First major release  |

```

* **Running Version**: the version number displayed in the software interface or release notes.
* **Codebase Version**: the internal development version of the core analysis engine.
* **Notes**: brief description of the release status.

---
## V2.0.0
This is a major front-end release that comprehensively modernizes the platform's user interface. It brings a consistent visual style to every page, adds two new overview pages, rebuilds the home page, and redesigns the way integrated datasets are presented. All data interfaces and analysis pipelines remain unchanged.

* **Consistent visual style across all pages**: Unified the color scheme, fonts, spacing, and the appearance of buttons, tables, and cards throughout the platform, so that every page now shares the same clean and modern look.
* **New Browse and About pages**: Added two overview pages — a **Browse** page that displays all available data types (single-cell RNA-seq, spatial transcriptomics, and modules coming soon) together with the development roadmap, and an **About** page that gathers documentation, news, usage statistics, and contact information in one place.
* **Rebuilt home page**: The home page was redesigned with a new banner area that includes an animated illustration of cell clusters, a clearer layout, and faster loading of the visit statistics on repeated visits.
* **Improved navigation bar and footer**: Reorganized the top navigation menu, and replaced the old footer with a new one that displays the running version of the platform.
* **Redesigned integrated dataset browsing**: The integrated datasets on the Single-cell and Spatial Transcriptomics pages are now presented as clear overview cards instead of the previous diagram with buttons placed on top of it. Each card shows a description, key numbers (species, brain regions, conditions), and quick navigation buttons — an overview of all samples, experimental conditions for mouse studies (0D Control, 3D, 7D, Susceptible, Resilient), and brain regions with diagnosis groups for human studies (e.g., BA46 → 2 Control / 2 MDD) — leading directly to the corresponding integrated study views.
* **Better loading experience**: Added a branded loading screen that fades out smoothly when the site is ready, avoiding abrupt content switching on first load.
* **Updated multilingual texts**: Extended the interface texts in English, Simplified Chinese, and Traditional Chinese to cover all new pages and components.
* **Stability improvements**: Fixed integrated study pages not refreshing when switching between study subsets, and optimized scroll behavior across pages.

---
## V1.1.1
This release includes interface optimizations and several bug fixes to enhance stability and user experience.

* **UI Enhancement**: Optimized the data display interfaces for single-cell and transcriptomics data, as well as integrated datasets, introducing synchronized interactions between charts during data exploration.
Updated the download links on the download page.
* **Bug Fixes**:
Resolved an error that occurred when clicking on (0‑day) data within the spatial transcriptomics integrated dataset view.
Fixed a rendering failure issue when opening the Methods page.
Addressed an error in fetching request data for spatial transcriptomics.

---
## V1.1.0

This version focuses on improving stability, usability, and accessibility of the platform.

* **Module optimization**: Refined the display and dynamic responsiveness of the *Differential Expression (DE)* and *Gene Set Enrichment* modules.
* **Heatmap robustness**: Enhanced array boundary protection to improve stability and prevent rendering errors.
* **Language support**: Improved English translations and added automatic language selection based on the browser’s default settings.
* **Documentation**: Integrated on-site documentation to guide users through key functionalities.

---

## V1.0.0

This release introduced a series of major improvements and new features, with emphasis on performance, usability, and analytical capabilities.

* **Consistent visualization**: Chart color schemes aligned with those in the corresponding publication for result consistency.
* **Differential expression analysis**: Added sorting functionality for clearer interpretation of results.
* **Enhanced navigation**: Implemented an advanced pagination component to improve browsing efficiency within the DE and Gene Set Enrichment results.
* **Interactive legends**: Redesigned legends enabling synchronized interaction between UMAP/ST spatial plots and gene expression maps.
* **Functional enrichment**: Completed three Gene Ontology (GO) enrichment analyses.
* **Improved user experience**: Introduced a loading screen and animated chart placeholders to avoid blank states during data processing.
* **Performance optimization**: Improved chart rendering efficiency and refined heatmap visualization for enhanced clarity.
* **Code maintenance**: Resolved multiple warning messages to ensure cleaner builds and more stable performance.
* **Dataset integration**: Finalized the dataset integration module, with spatial transcriptomics (ST) datasets displayed in separate views.




