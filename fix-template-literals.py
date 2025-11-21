#!/usr/bin/env python3
import re

# Read the file
with open('public/modern-app.js', 'r') as f:
    content = f.read()

# Pattern to find the problematic section (lines 915-952 approximately)
# We need to replace the nested template literals with function calls

# Find and replace compulsory modules section
compulsory_pattern = r'<tbody class="bg-white dark:bg-gray-900">\s+\$\{deduplicateModules\(rule\.module\)\.map\(\(mod, index\) => \{\s+const moduleKey = \\`\\\$\{mod\.moduleCode\}_\\\$\{year\}\\`;.*?\\\`\}\)\.join\(\'\'\)\}\s+</tbody>'

compulsory_replacement = '''<tbody class="bg-white dark:bg-gray-900">
                                                ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join('')}
                                            </tbody>'''

# Use DOTALL flag to match across newlines
content = re.sub(compulsory_pattern, compulsory_replacement, content, flags=re.DOTALL)

# Write back
with open('public/modern-app.js', 'w') as f:
    f.write(content)

print("Fixed template literals")
