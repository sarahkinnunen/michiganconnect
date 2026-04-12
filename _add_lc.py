import glob, os, sys

base = os.getcwd()

def patch(path, old, new):
    txt = open(path, encoding='utf-8').read()
    if old not in txt:
        print(f'  SKIP (not found): {path}')
        return False
    open(path, 'w', encoding='utf-8').write(txt.replace(old, new, 1))
    print(f'  OK: {path}')
    return True

top_level = [f for f in glob.glob('*.html') if 'learning-center' not in f]
cat_pages = glob.glob('category/*.html')

# ── 1. Desktop nav top-level ─────────────────────────────────────────────────
print("\n[1] Desktop nav – top-level")
OLD = '          <li><a href="directory.html">Find Resources</a></li>'
NEW = ('          <li><a href="directory.html">Find Resources</a></li>\n'
       '          <li><a href="learning-center.html">Learning Center</a></li>')
for f in top_level: patch(f, OLD, NEW)

# ── 2. Mobile nav top-level ──────────────────────────────────────────────────
print("\n[2] Mobile nav – top-level")
OLD = '        <li><a href="directory.html">Find Resources</a></li>'
NEW = ('        <li><a href="directory.html">Find Resources</a></li>\n'
       '        <li><a href="learning-center.html">Learning Center</a></li>')
for f in top_level: patch(f, OLD, NEW)

# ── 3. Desktop nav category pages ───────────────────────────────────────────
print("\n[3] Desktop nav – category pages")
OLD = '          <li><a href="../directory.html">Find Resources</a></li>'
NEW = ('          <li><a href="../directory.html">Find Resources</a></li>\n'
       '          <li><a href="../learning-center.html">Learning Center</a></li>')
for f in cat_pages: patch(f, OLD, NEW)

# ── 4. Mobile nav category pages ────────────────────────────────────────────
print("\n[4] Mobile nav – category pages")
OLD = '        <li><a href="../directory.html">Find Resources</a></li>'
NEW = ('        <li><a href="../directory.html">Find Resources</a></li>\n'
       '        <li><a href="../learning-center.html">Learning Center</a></li>')
for f in cat_pages: patch(f, OLD, NEW)

# ── 5. Footer Site col – top-level ──────────────────────────────────────────
print("\n[5] Footer Site col – top-level")
OLD = '            <li><a href="directory.html">Resource Directory</a></li>'
NEW = ('            <li><a href="directory.html">Resource Directory</a></li>\n'
       '            <li><a href="learning-center.html">Learning Center</a></li>')
for f in top_level: patch(f, OLD, NEW)

# ── 6. Footer Site col – category pages ─────────────────────────────────────
print("\n[6] Footer Site col – category pages")
OLD = '            <li><a href="../directory.html">Resource Directory</a></li>'
NEW = ('            <li><a href="../directory.html">Resource Directory</a></li>\n'
       '            <li><a href="../learning-center.html">Learning Center</a></li>')
for f in cat_pages: patch(f, OLD, NEW)

# ── 7. Other Cats tile – immigration & human-trafficking (end with education) ─
print("\n[7] Other Cats tile – immigration & human-trafficking")
OLD = ('          <a href="education.html" class="category-tile" data-category="education">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-mortarboard-fill" aria-hidden="true"></i></span><span>Education</span>\n'
       '          </a>\n'
       '        </div>')
NEW = (OLD.replace('        </div>',
       '          <a href="../learning-center.html" class="category-tile" data-category="learning">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-journal-text" aria-hidden="true"></i></span><span>Learning Center</span>\n'
       '          </a>\n'
       '        </div>'))
for f in ['category/immigration.html', 'category/human-trafficking.html']:
    patch(f, OLD, NEW)

# ── 8. Other Cats tile – all other category pages (end with immigration) ─────
print("\n[8] Other Cats tile – remaining category pages")
OLD = ('          <a href="immigration.html" class="category-tile" data-category="immigration">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-globe-americas" aria-hidden="true"></i></span><span>Immigration</span>\n'
       '          </a>\n'
       '        </div>')
NEW = ('          <a href="immigration.html" class="category-tile" data-category="immigration">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-globe-americas" aria-hidden="true"></i></span><span>Immigration</span>\n'
       '          </a>\n'
       '          <a href="../learning-center.html" class="category-tile" data-category="learning">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-journal-text" aria-hidden="true"></i></span><span>Learning Center</span>\n'
       '          </a>\n'
       '        </div>')
skip = {'category/immigration.html', 'category/human-trafficking.html'}
for f in cat_pages:
    if f not in skip:
        patch(f, OLD, NEW)

# ── 9. Index – Learning Center tile in category grid ─────────────────────────
print("\n[9] Index category tile")
OLD = ('          <a href="category/immigration.html" class="category-tile" data-category="immigration"\n'
       '             role="listitem" aria-label="Immigration resources">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-globe-americas" aria-hidden="true"></i></span>\n'
       '            <span>Immigration</span>\n'
       '          </a>')
NEW = (OLD + '\n'
       '          <a href="learning-center.html" class="category-tile" data-category="learning"\n'
       '             role="listitem" aria-label="Learning Center – how-to guides">\n'
       '            <span class="tile-icon" aria-hidden="true"><i class="bi bi-journal-text" aria-hidden="true"></i></span>\n'
       '            <span>Learning Center</span>\n'
       '          </a>')
patch('index.html', OLD, NEW)

print("\nAll done.")
