#!/bin/bash
# gen_changelog_final.sh

outFile="changelog.md"
> "$outFile"

fixed_keywords="fix error"
removed_keywords="delete remove bug"

# Hent hele log med unik separator
SEP="__GITCOMMITSEP__"
log=$(git log --pretty=format:"%ad|%s|%b${SEP}" --date=short)

# --- Del opp commits --- 
# Vi bruker ikke array, men while-read for å ikke splitte linjer
echo "$log" | tr "$SEP" '\n' | while IFS= read -r entry; do
    entry=$(echo "$entry" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$entry" ] && continue

    date=$(echo "$entry" | cut -d'|' -f1)
    subject=$(echo "$entry" | cut -d'|' -f2 | xargs)
    body=$(echo "$entry" | cut -d'|' -f3- | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | xargs)

    # hopp over commits uten gyldig dato
    if ! [[ "$date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        continue
    fi

    # hopp over update*
    lower_subject=$(echo "$subject" | tr '[:upper:]' '[:lower:]')
    [[ "$lower_subject" == update* ]] && continue

    # format date
    dateStr=$(date -j -f "%Y-%m-%d" "$date" "+%d-%m-%Y" 2>/dev/null || echo "$date")

    # kategori
    cat="Changed"
    for kw in $removed_keywords; do
        if echo "$lower_subject" | grep -iq "$kw"; then
            cat="Removed/Bugs"
            break
        fi
    done
    if [[ "$cat" == "Changed" ]]; then
        for kw in $fixed_keywords; do
            if echo "$lower_subject" | grep -iq "$kw"; then
                cat="Fixed"
                break
            fi
        done
    fi

    # lag commit-line på én linje
    if [ -n "$body" ]; then
        commitLine="- [$dateStr] $subject: $body"
    else
        commitLine="- [$dateStr] $subject"
    fi

    # skriv til midlertidig fil per kategori
    case "$cat" in
        "Changed") echo "$commitLine" >> changed.tmp ;;
        "Fixed") echo "$commitLine" >> fixed.tmp ;;
        "Removed/Bugs") echo "$commitLine" >> removed.tmp ;;
    esac
done

# sorter synkende
sort -r changed.tmp > changed_sorted.tmp
sort -r fixed.tmp > fixed_sorted.tmp
sort -r removed.tmp > removed_sorted.tmp

write_category() {
    local title=$1
    local file=$2
    [ ! -s "$file" ] && return
    echo "### $title" >> "$outFile"
    cat "$file" >> "$outFile"
    echo "" >> "$outFile"
}

write_category "Changed" changed_sorted.tmp
write_category "Fixed" fixed_sorted.tmp
write_category "Removed/Bugs" removed_sorted.tmp

rm -f *.tmp

echo "Changelog generated to $outFile"
