#!/bin/bash

# Script to find unused files, empty files, and duplicate pages
# Usage: ./scripts/find-unused-files.sh

echo "🔍 Analyzing repository for unused files..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Find empty files (excluding node_modules, .next, .git)
echo -e "${YELLOW}📄 Empty files:${NC}"
empty_count=0
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -size 0 2>/dev/null | while read file; do
  echo -e "${RED}  - $file${NC}"
  ((empty_count++))
done
echo ""

# 2. Find duplicate page files (multiple page.tsx in same directory)
echo -e "${YELLOW}📄 Duplicate page files:${NC}"
duplicate_count=0
find src/app -type d 2>/dev/null | while read dir; do
  page_count=$(find "$dir" -maxdepth 1 -name "page*.tsx" -o -name "page*.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$page_count" -gt 1 ]; then
    echo -e "${RED}  - $dir/ has $page_count page files:${NC}"
    find "$dir" -maxdepth 1 -name "page*.tsx" -o -name "page*.ts" 2>/dev/null | while read pfile; do
      echo -e "    ${YELLOW}$(basename "$pfile")${NC}"
    done
    ((duplicate_count++))
  fi
done
echo ""

# 3. Find unused components (not imported anywhere)
echo -e "${YELLOW}🔍 Checking for potentially unused components...${NC}"
echo "  (This may take a while...)"
echo ""

unused_components=0
find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) ! -name "*.test.*" ! -name "*.spec.*" 2>/dev/null | while read comp_file; do
  comp_name=$(basename "$comp_file" | sed 's/\.[^.]*$//')
  comp_dir=$(dirname "$comp_file" | sed 's|^src/||')
  comp_dir_relative=$(dirname "$comp_file" | sed 's|^src/components/||')
  
  # Skip index files and UI components
  if [[ "$comp_name" == "index" ]] || [[ "$comp_dir" == *"ui"* ]]; then
    continue
  fi
  
  # Check if component is imported
  # Search for: import X from, import { X }, @/components/path
  import_count=$(grep -ri \
    -e "from.*['\"].*$comp_name" \
    -e "import.*$comp_name" \
    -e "require.*$comp_name" \
    -e "@/components/$comp_dir_relative" \
    src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$comp_file" | \
    grep -v "node_modules" | \
    wc -l | tr -d ' ')
  
  if [ "$import_count" -eq 0 ]; then
    echo -e "${RED}  - $comp_file (not imported)${NC}"
    ((unused_components++))
  fi
done
echo ""

# 4. Find unused API endpoints (not called from frontend)
echo -e "${YELLOW}🔍 Checking for potentially unused API endpoints...${NC}"
echo "  (Using improved detection for dynamic routes and concatenation)"
echo ""

unused_apis=0
find src/app/api -type f -name "route.ts" 2>/dev/null | while read api_file; do
  # Extract API path from file location
  # e.g., src/app/api/tournaments/[code]/matches/route.ts -> /tournaments/[code]/matches
  api_path=$(echo "$api_file" | sed 's|src/app/api||' | sed 's|/route\.ts$||')
  
  # 1. Direct match with relaxed dynamic segments
  # This handles template literals like `/api/tournaments/${code}/matches`
  # and simple concatenation on the same line.
  search_pattern=$(echo "$api_path" | sed 's|\[[^]]*\]|.*|g')
  
  call_count=$(grep -riE \
    -e "['\"\`].*api$search_pattern" \
    -e "['\"\`].*$api_path" \
    src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$api_file" | \
    grep -v "node_modules" | \
    wc -l | tr -d ' ')
  
  if [ "$call_count" -gt 0 ]; then
    continue
  fi

  # 2. Segment-based match (more robust for multi-line or complex concatenation)
  # Extract static segments (filter out [something])
  # e.g., /tournaments/[code]/matches -> tournaments, matches
  segments=$(echo "$api_path" | tr '/' '\n' | grep -v '^\[' | grep -v '^$')
  segment_count=$(echo "$segments" | wc -l | tr -d ' ')
  
  if [ "$segment_count" -gt 0 ]; then
    # Start with a list of all files
    matching_files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
    
    # Progressively filter files that contain each segment
    while read -r segment; do
      if [ -n "$matching_files" ]; then
        matching_files=$(echo "$matching_files" | xargs grep -l "$segment" 2>/dev/null)
      fi
    done <<< "$segments"
    
    # Remove the api_file itself from the results
    matching_files=$(echo "$matching_files" | grep -v "$api_file")
    
    file_count=$(echo "$matching_files" | grep -v "^$" | wc -l | tr -d ' ')
    
    if [ "$file_count" -gt 0 ]; then
      # If we found files containing all segments, consider it "potentially used"
      # But only if it's not too common (e.g., skip if more than 50 files match, as it might be generic terms)
      if [ "$file_count" -lt 50 ]; then
        continue
      fi
    fi
  fi

  # 3. Special case for very short paths or common names
  # If it's a top-level route like /api/logs, just check for "api/logs" or "/logs"
  if [ "$segment_count" -eq 1 ]; then
    last_segment=$(echo "$api_path" | awk -F'/' '{print $NF}')
    if grep -riQ "api/$last_segment" src --include="*.ts" --include="*.tsx" | grep -v "$api_file" | grep -v "node_modules" > /dev/null; then
      continue
    fi
  fi

  # If we reached here, it's likely unused
  echo -e "${RED}  - $api_file${NC}"
  echo -e "    ${BLUE}Path: /api$api_path${NC}"
  ((unused_apis++))
done
echo ""

# 5. Find potentially unused pages
echo -e "${YELLOW}🔍 Checking for potentially unused pages...${NC}"
echo "  (Checking for pages not linked from navigation or other pages)"
echo ""

unused_pages=0
find src/app -type f -name "page.tsx" 2>/dev/null | while read page_file; do
  # Extract route path from file location
  page_path=$(echo "$page_file" | sed 's|src/app||' | sed 's|/page\.tsx$||')
  
  # Skip root page and special pages
  if [[ "$page_path" == "" ]] || [[ "$page_path" == "/api"* ]] || [[ "$page_path" == "/_"* ]]; then
    continue
  fi
  
  # Convert dynamic segments for search
  page_path_pattern=$(echo "$page_path" | sed 's|\[[^]]*\]|[^/'"'"'"\`]*|g')
  
  # Search for links/navigation to this page
  # Look for: href="/path", router.push("/path"), Link to="/path"
  link_count=$(grep -riE \
    -e "href=['\"\`]$page_path_pattern" \
    -e "to=['\"\`]$page_path_pattern" \
    -e "router\.(push|replace).*['\"\`]$page_path_pattern" \
    -e "navigate.*['\"\`]$page_path_pattern" \
    src --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$page_file" | \
    grep -v "node_modules" | \
    wc -l | tr -d ' ')
  
  if [ "$link_count" -eq 0 ]; then
    echo -e "${YELLOW}  - $page_file${NC}"
    echo -e "    ${BLUE}Route: $page_path${NC}"
    echo -e "    ${BLUE}(May be accessed directly or externally)${NC}"
    ((unused_pages++))
  fi
done
echo ""

# 6. Find files with suspicious names (backup/duplicate patterns)
echo -e "${YELLOW}📄 Files with suspicious names (backup/duplicate patterns):${NC}"
suspicious_count=0
find src -type f \( -name "*new*.tsx" -o -name "*old*.tsx" -o -name "*backup*.tsx" -o -name "*copy*.tsx" -o -name "*temp*.tsx" -o -name "*-2.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -name "NavbarNew.tsx" 2>/dev/null | while read file; do
  echo -e "${YELLOW}  - $file${NC}"
  ((suspicious_count++))
done
echo ""

# 7. Find very large files that might need refactoring
echo -e "${YELLOW}📊 Large files (>500 lines - consider refactoring):${NC}"
large_count=0
find src -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*" ! -path "*/.next/*" 2>/dev/null | while read file; do
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -gt 500 ]; then
    echo -e "${YELLOW}  - $file (${lines} lines)${NC}"
    ((large_count++))
  fi
done
echo ""

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  - Empty files: Check output above"
echo "  - Duplicate pages: Check output above"
echo "  - Potentially unused components: Check output above"
echo "  - Potentially unused API routes: Check output above"
echo "  - Potentially unused pages: Check output above"
echo "  - Suspicious filenames: Check output above"
echo "  - Large files: Check output above"
echo ""
echo "💡 Tips:"
echo "  - Review empty files and consider removing them"
echo "  - Check duplicate page files - keep only the active one"
echo "  - Verify unused components before deleting (might be used dynamically)"
echo "  - API endpoints might be called from external sources or used internally"
echo "  - Pages might be accessed directly via URL without internal links"
echo "  - Consider refactoring large files into smaller, more maintainable modules"
echo ""
