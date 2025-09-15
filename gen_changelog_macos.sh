#!/bin/bash
# gen_changelog_multibody.sh
# macOS terminal-vennlig

outFile="changelog.md"
> "$outFile"  # clear file

# Kategorier og nøkkelord
declare -A categories
categories[Changed]="fix update changed refactor cleanup"
categories[Fixed]="bug error fix correct"
categories[Removed]="delete remove"

# Hent git log (date|subject|body)
log=$(git log --pretty=format:"%ad|%s|%b" --date=short)

# Split commits på dato-linje
IFS=$'\n' read -d '' -r -a commits <<< "$log"

# Init commit arrays
declare -A commitGroups
commitGroups[Changed]=""
commitGroups[Fixed]=""
commitGroups[Removed]=""

for entry in "${commits[@]}"; do
    IFS='|' read -r date subject body <<< "$entry"
    subject=$(echo "$subject" | xargs)
    body=$(echo "$body" | xargs)

    # Hopp over commits som starter med "update"
    firstWord=$(echo "$subject" | awk '{print tolower($1)}')
    if [[ "$firstWord" == "update" ]]; then
        continue
    fi

    # Finn kategori
    cat="Changed"
    for key in "${!categories[@]}"; do
        for kw in ${categories[$key]}; do
            if echo "$subject" | grep -iq "$kw"; then
                cat="$key"
                break 2
            fi
        done
    done

    # Legg til commit i gruppen
    commitGroups[$cat]+="$date|$subject|$body"$'\n'
done

# Skriv changelog
for cat in Changed Fixed Removed; do
    group="${commitGroups[$cat]}"
    if [[ -z "$group" ]]; then continue; fi

    echo "### $cat" >> "$outFile"
    # sort descending på dato
    echo "$group" | sort -r | while IFS='|' read -r date subject body; do
        dt=$(date -j -f "%Y-%m-%d" "$date" +"%d-%m-%Y")
        echo "- [$dt] $subject" >> "$outFile"
        if [[ -n "$body" ]]; then
            while IFS= read -r line; do
                [[ -z "$line" || "$line" == "$subject" ]] && continue
                echo "    $line" >> "$outFile"
            done <<< "$body"
        fi
    done
    echo "" >> "$outFile"
done

echo "Changelog generated to $outFile"
