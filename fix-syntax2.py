#!/usr/bin/env python3

# Read the file
with open('public/modern-app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

output_lines = []
skip_until = -1

for i, line in enumerate(lines, 1):
    if skip_until > 0 and i <= skip_until:
        continue

    # Check for the problematic pattern
    if '${deduplicateModules(rule.module).map((mod, index) => {' in line:
        # Found start of problematic section
        # Add simple version instead
        indent = ' ' * 48  # Match indentation
        output_lines.append(indent + '<tbody class="bg-white dark:bg-gray-900">\n')
        output_lines.append(indent + '    ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join(\'\')}\n')

        # Skip until we find the closing of this map function
        # Look for the line with `}).join('')}`
        skip_count = 0
        for j in range(i, len(lines) + 1):
            if '}).join(\'\')}'  in lines[j-1]:
                skip_until = j
                break
        continue

    output_lines.append(line)

# Write back
with open('public/modern-app.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"Fixed syntax errors. Processed {len(lines)} lines, output {len(output_lines)} lines.")
