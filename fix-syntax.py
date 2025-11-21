#!/usr/bin/env python3

# Read the file
with open('public/modern-app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace the problematic sections
# We need to replace lines 916-935 (compulsory) and 963-982 (optional) with simpler code

output_lines = []
skip_until = -1

for i, line in enumerate(lines, 1):
    if skip_until > 0 and i <= skip_until:
        continue

    # Replace compulsory modules tbody section (lines 915-936)
    if i == 915 and '${deduplicateModules(rule.module).map((mod, index) => {' in line:
        # Replace lines 915-936 with simpler renderModuleRow call
        output_lines.append('                                            <tbody class="bg-white dark:bg-gray-900">\n')
        output_lines.append('                                                ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join(\'\')}\n')
        skip_until = 936
        continue

    # Replace optional modules tbody section (lines 962-983)
    if i == 962 and '${deduplicateModules(rule.module).map((mod, index) => {' in line:
        # Replace lines 962-983 with simpler renderModuleRow call
        output_lines.append('                                            <tbody class="bg-white dark:bg-gray-900">\n')
        output_lines.append('                                                ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join(\'\')}\n')
        skip_until = 983
        continue

    output_lines.append(line)

# Write back
with open('public/modern-app.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"Fixed syntax errors. Processed {len(lines)} lines, output {len(output_lines)} lines.")
