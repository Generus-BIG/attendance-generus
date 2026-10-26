# Target Materi regression fixtures

The six XLSX files are unchanged copies from the user-supplied `Template-materi-lupg.zip` (26 October 2026). Class 4 was absent.

`expected.json` records source row, month, category, material, and detail for every non-empty detail row. It was extracted independently from XLSX XML master cells with Python's standard `zipfile`/`ElementTree`, without ExcelJS or the application's parser. January–December scope comes from column A, category from C, material from D, and detail from E. Placeholder and average rows are excluded.

| File           | Detail rows |
| -------------- | ----------: |
| PAUD-2026.xlsx |         168 |
| ACR-1.xlsx     |         173 |
| ACR-2.xlsx     |         172 |
| ACR-3.xlsx     |         172 |
| ACR-5.xlsx     |         284 |
| ACR-6.xlsx     |         288 |

All files retain their original 2025 school-year headings; the import year's explicit selection determines the reporting year. The user confirmed that class 3 intentionally shares class 2's heading/template. File scope keeps the two classes' reports separate.
