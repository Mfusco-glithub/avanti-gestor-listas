import zipfile, xml.etree.ElementTree as ET, re, sys

xlsm = r'C:\Users\Marcelo Fusco\AppData\Roaming\Claude\local-agent-mode-sessions\c9da0bd1-a351-4ca7-b7ea-d8ed23d4893e\d0f1d9d5-37b9-40ec-b02c-1e88e57b2658\local_a01e0ffa-9a0a-4121-be55-3383f0a5d834\uploads\TILPP_14837_LABREZZA_09032026-70c5a487.xlsm'
out = r'D:\Flowstica\Projects\gestor-listas\xlsm_data.txt'

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

with zipfile.ZipFile(xlsm) as z:
    names = z.namelist()
    shared = []
    if 'xl/sharedStrings.xml' in names:
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(f'{{{NS}}}si'):
            t = ''.join(x.text or '' for x in si.iter(f'{{{NS}}}t'))
            shared.append(t)

    lines = [f'Sheets: {[n for n in names if n.startswith("xl/work")]}', '']

    sheets = sorted([n for n in names if re.match(r'xl/worksheets/sheet\d+\.xml', n)])
    for sheet_path in sheets:
        lines.append(f'=== {sheet_path} ===')
        root = ET.fromstring(z.read(sheet_path))
        rows_data = []
        for row in root.findall(f'.//{{{NS}}}row'):
            row_vals = []
            for c in row.findall(f'{{{NS}}}c'):
                t_attr = c.get('t', '')
                v_el = c.find(f'{{{NS}}}v')
                if v_el is None:
                    row_vals.append('')
                elif t_attr == 's':
                    idx = int(v_el.text)
                    row_vals.append(shared[idx] if idx < len(shared) else '')
                else:
                    row_vals.append(v_el.text or '')
            rows_data.append(row_vals)
        for r in rows_data[:200]:
            if any(v for v in r):
                lines.append(str(r))
        lines.append('')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('OK ->', out)
