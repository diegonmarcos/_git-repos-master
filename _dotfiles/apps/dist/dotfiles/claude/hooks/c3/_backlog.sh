# Shared by the backlog hooks: locate the Product Backlog repo (cloudy-a-docs) checkout.
# Override with C3_BACKLOG_REPO. Prints the repo root, or nothing when no checkout is present.
backlog_repo() {
  local c
  for c in "$C3_BACKLOG_REPO" "${CLAUDE_PROJECT_DIR:-.}" "${CLAUDE_PROJECT_DIR:-.}/../cloudy-a-docs" "$HOME/cloudy-a-docs" "$HOME/git/cloudy-a-docs" /home/user/cloudy-a-docs; do
    [ -n "$c" ] && [ -d "$c/1___BACKLOG___/1.1.Product-Backlog/tasks" ] && { (cd "$c" && pwd); return 0; }
  done
  return 1
}
