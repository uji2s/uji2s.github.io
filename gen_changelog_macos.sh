#!/bin/bash
# gen_changelog_macos.sh
# Lager changelog.md på MacOS med [dd-mm-yyyy] format
# Ignorerer commits som starter med "update"

outFile="changelog.md"
> "$outFile"

# --- Definer keywords per kategori ---
changed_keywords="fix update changed refactor cleanup added feat"
fixed_keywords="bug error fix correct"
removed_keywords="delete remove"

# --- Hent git log ---
log=$(git log --pretty=format:"%ad|%s|%B" --date=short)

# --- Del opp commits ---
IFS=$'\n'
commits=($log)
unset IFS

# --- Opprett arrays ---
changed_commits=()
fixed_commits=()
removed_commits=()

for entry in "${commits[@]}"; do
  date=$(echo "$entry" | cut -d'|' -f1)
  subject=$(echo "$entry" | cut -d'|' -f2 | xargs)
  body=$(echo "$entry" | cut -d'|' -f3- | sed '/^\s*$/d' | sed "s/^$subject$//")

  # --- Hopp over hvis subject starter med "update" ---
  lower_subject=$(echo "$subject" | tr '[:upper:]' '[:lower:]')
  if [[ "$lower_subject" == update* ]]; then
    continue
  fi

  # --- Formater dato til dd-mm-yyyy ---
  if dateParsed=$(date -j -f "%Y-%m-%d" "$date" "+%d-%m-%Y" 2>/dev/null); then
    dateStr="$dateParsed"
  else
    dateStr="$date"
  fi

  # --- Finn kategori ---
  cat="Changed"

  for kw in $changed_keywords; do
    if echo "$lower_subject" | grep -q "$kw"; then
      cat="Changed"
      break
    fi
  done
  for kw in $fixed_keywords; do
    if echo "$lower_subject" | grep -q "$kw"; then
      cat="Fixed"
      break
    fi
  done
  for kw in $removed_keywords; do
    if echo "$lower_subject" | grep -q "$kw"; then
      cat="Removed"
      break
    fi
  done

  # --- Formater commit med dato ---
  commitLine="- [$dateStr] $subject"
  if [ -n "$body" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      commitLine="$commitLine
    $line"
    done <<<"$body"
  fi

  # --- Legg til i riktig kategori ---
  case "$cat" in
    "Changed") changed_commits+=("$commitLine") ;;
    "Fixed") fixed_commits+=("$commitLine") ;;
    "Removed") removed_commits+=("$commitLine") ;;
  esac
done

# --- Skriv changelog ---
for cat in "Changed" "Fixed" "Removed"; do
  case "$cat" in
    "Changed") arr=("${changed_commits[@]}") ;;
    "Fixed") arr=("${fixed_commits[@]}") ;;
    "Removed") arr=("${removed_commits[@]}") ;;
  esac

  if [ ${#arr[@]} -eq 0 ]; then
    continue
  fi

  echo "### $cat" >> "$outFile"
  for c in "${arr[@]}"; do
    echo "$c" >> "$outFile"
  done
  echo "" >> "$outFile"
done

echo "Changelog generated to $outFile"
