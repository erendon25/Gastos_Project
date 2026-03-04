import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create mapping of regex replacements
    replacements = [
        (r"'#ffffff'", "'var(--text-primary)'"),
        (r"'#fff'", "'var(--text-primary)'"),
        (r"'#000000'", "'var(--bg-color)'"),
        (r"'#000'", "'var(--bg-color)'"),
        (r"'#111'", "'var(--card-bg-light)'"),
        (r"'#1a1a1a'", "'var(--card-bg)'"),
        (r"'#161616'", "'var(--card-bg)'"),
        (r"'#0a0a0a'", "'var(--bg-color)'"),
        (r"'#222'", "'var(--border-color)'"),
        (r"'#333'", "'var(--glass-border)'"),
        (r"'#444'", "'var(--border-color)'"),
        (r"'#555'", "'var(--text-tertiary)'"),
        (r"'#666'", "'var(--text-secondary)'"),
        (r"'#888'", "'var(--text-secondary)'"),
        (r"'#aaa'", "'var(--text-secondary)'"),
        (r"'#e0e0e0'", "'var(--border-color)'"),
        (r"'#2c2c2e'", "'var(--border-color)'"),
        (r"'rgba\(255,255,255,0\.05\)'", "'var(--glass-highlight)'"),
        (r"'rgba\(255,\s*255,\s*255,\s*0\.05\)'", "'var(--glass-highlight)'"),
        (r"'rgba\(255,255,255,0\.1\)'", "'var(--glass-border)'"),
        (r"'rgba\(255, 255, 255, 0\.1\)'", "'var(--glass-border)'"),
        (r"'1px solid #333'", "'1px solid var(--glass-border)'"),
        (r"'1px solid #222'", "'1px solid var(--border-color)'"),
        (r"'1px solid rgba\(255,255,255,0\.05\)'", "'1px solid var(--glass-border)'"),
        (r"'1px solid rgba\(255, 255, 255, 0\.05\)'", "'1px solid var(--glass-border)'"),
        (r"'2px solid #fff'", "'2px solid var(--text-primary)'"),
        (r"'rgba\(255,255,255,0\.02\)'", "'var(--glass-bg)'"),
        (r"'rgba\(255, 255, 255, 0\.02\)'", "'var(--glass-bg)'"),
        (r"'rgba\(255,255,255,0\.03\)'", "'var(--glass-bg)'"),
        (r"'rgba\(255, 255, 255, 0\.03\)'", "'var(--glass-bg)'"),
        (r'"#ffffff"', '"var(--text-primary)"'),
        (r'"#fff"', '"var(--text-primary)"'),
    ]

    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)
        
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file_path}')

src_dir = os.path.join('d:\\', 'Gastos_Project', 'web', 'src')
count = 0
for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
            count += 1
print(f'Processed {count} files.')
