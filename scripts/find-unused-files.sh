#!/bin/bash

# Script to find unused files, empty files, and duplicate pages
# Usage: ./scripts/find-unused-files.sh

echo "🔍 Analyzing repository for unused files..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# 1. Find empty files (excluding node_modules, .next, .git)
echo -e "${YELLOW}📄 Empty files:${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -size 0 2>/dev/null | while read file; do
  echo -e "${RED}  - $file${NC}"
done
echo ""

# 2. Find duplicate page files (multiple page.tsx in same directory)
echo -e "${YELLOW}📄 Duplicate page files:${NC}"
find src/app -type f -name "page*.tsx" -o -name "page*.ts" 2>/dev/null | sort | while read file; do
  dir=$(dirname "$file")
  count=$(find "$dir" -maxdepth 1 -name "page*.tsx" -o -name "page*.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt 1 ]; then
    echo -e "${RED}  - $dir/ has $count page files:${NC}"
    find "$dir" -maxdepth 1 -name "page*.tsx" -o -name "page*.ts" 2>/dev/null | while read pfile; do
      echo -e "    ${YELLOW}$(basename "$pfile")${NC}"
    done
  fi
done
echo ""

# 3. Find unused components (not imported anywhere)
echo -e "${YELLOW}🔍 Checking for potentially unused components...${NC}"
echo "  (This may take a while...)"
echo ""

# Get all component files
find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null | while read comp_file; do
  comp_name=$(basename "$comp_file" | sed 's/\.[^.]*$//')
  comp_dir=$(dirname "$comp_file" | sed 's|^src/||')
  comp_dir_relative=$(dirname "$comp_file" | sed 's|^src/components/||')
  
  # Skip index files and UI components
  if [[ "$comp_name" == "index" ]] || [[ "$comp_dir" == *"ui"* ]]; then
    continue
  fi
  
  # Check if component is imported (multiple patterns)
  # Search for component name in imports (case-insensitive)
  # Also search for file path patterns
  
  import_count=$(grep -ri \
    -e "from.*['\"].*$comp_name" \
    -e "import.*$comp_name" \
    -e "require.*$comp_name" \
    -e "$comp_dir_relative" \
    -e "$comp_dir" \
    src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$comp_file" | \
    grep -v "node_modules" | \
    wc -l | tr -d ' ')
  
  if [ "$import_count" -eq 0 ]; then
    echo -e "${RED}  - $comp_file (not imported)${NC}"
  fi
done
echo ""

# 4. Find unused API endpoints (not called from frontend)
echo -e "${YELLOW}🔍 Checking for potentially unused API endpoints...${NC}"
echo "  (This may take a while...)"
echo ""

# Get all API route files
find src/app/api -type f -name "route.ts" 2>/dev/null | while read api_file; do
  # Extract API path from file location
  api_path=$(echo "$api_file" | sed 's|src/app/api||' | sed 's|/route\.ts$||')
  
  # Convert [param] to various patterns that might be used
  # e.g., /tournaments/[code] -> search for /tournaments/code, /tournaments/${code}, etc.
  api_path_base=$(echo "$api_path" | sed 's|\[[^]]*\]||g')
  api_path_with_star=$(echo "$api_path" | sed 's|\[\([^]]*\)\]|*|g')
  
  # Extract endpoint name (last segment before [param] or final segment)
  endpoint_name=$(echo "$api_path" | awk -F'/' '{print $NF}' | sed 's|\[\([^]]*\)\]|\1|')
  
  # Search for API calls in various formats:
  # 1. axios.get('/api/tournaments/code')
  # 2. axios.post(`/api/tournaments/${code}/reopen`)
  # 3. fetch('/api/tournaments/code')
  # 4. '/api/tournaments/code' in strings
  
  # Build search terms
  search_terms=""
  if [ -n "$api_path_base" ]; then
    search_terms="$search_terms -e \"/api$api_path_base\""
  fi
  if [ -n "$endpoint_name" ] && [ "$endpoint_name" != "$api_path_base" ]; then
    search_terms="$search_terms -e \"$endpoint_name\""
  fi
  
  # Search for axios and fetch calls
  call_count=$(grep -ri \
    -e "axios\.\(get\|post\|put\|delete\|patch\).*['\"\`]/api$api_path_base" \
    -e "axios\.\(get\|post\|put\|delete\|patch\).*['\"\`].*api.*$endpoint_name" \
    -e "fetch.*['\"\`]/api$api_path_base" \
    -e "/api$api_path_base" \
    src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$api_file" | \
    grep -v "node_modules" | \
    wc -l | tr -d ' ')
  
  if [ "$call_count" -eq 0 ]; then
    echo -e "${RED}  - $api_file (path: $api_path) - not called from frontend${NC}"
  fi
done
echo ""

# 5. Find files with suspicious names (new-page.tsx, page-new.tsx, etc.)
echo -e "${YELLOW}📄 Files with suspicious names (backup/duplicate patterns):${NC}"
find src -type f \( -name "*new*.tsx" -o -name "*old*.tsx" -o -name "*backup*.tsx" -o -name "*test*.tsx" -o -name "*temp*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" 2>/dev/null | while read file; do
  echo -e "${YELLOW}  - $file${NC}"
done
echo ""

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo ""
echo "💡 Tips:"
echo "  - Review empty files and consider removing them"
echo "  - Check duplicate page files - keep only the active one"
echo "  - Verify unused components before deleting (might be used dynamically)"
echo "  - API endpoints might be called from external sources or used internally"
echo ""
