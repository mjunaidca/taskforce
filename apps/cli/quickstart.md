# Quick Start

Demo first

```uv run taskflow demo --no-cleanup```
```uv run taskflow i```

```>> list```
```>> add "New Task"```
```>> show 3```
```>> edit 3 --title "Updated Title"```
```>> edit 3 --assign @sarah```
```>> start 3```
```>> progress 3 --percent 50```
```>> complete 3```
```>> audit list --task 3```

  ```>>add "Review PR #42" --description "Check authentication logic and error handling"```
  ```>>edit 3 --description "Updated requirements based on feedback" ```
  ```>>start 4```
  ```>>progress 4 --percent 50 --note "Completed initial review, waiting for tests"```


  taskflow> # View a task
  taskflow> show 3

  taskflow> # Edit task fields
  taskflow> edit 3 --title "Updated Title"
  taskflow> edit 3 --priority high
  taskflow> edit 3 --status pending
  taskflow> edit 3 --assign @sarah

  taskflow> # Work on a task (workflow)
  taskflow> start 3                    # Start working (pending → in_progress)
  taskflow> progress 3 --percent 50    # Update progress
  taskflow> complete 3                 # Mark done

  taskflow> # Or use review workflow
  taskflow> start 3
  taskflow> review 3                   # Request review
  taskflow> approve 3                  # Approve (or reject 3 --reason "needs work")

  taskflow> # Delete a task
  taskflow> delete 3
  taskflow> delete 3 --force           # Skip confirmation

  taskflow> # Search tasks
  taskflow> search "unit test"

  taskflow> # View audit history
  taskflow> audit task 3               # See all actions on task #3
  taskflow> audit list                 # See all audit logs

  Quick reference:

  | Action          | Command                       |
  |-----------------|-------------------------------|
  | View task       | show <id>                     |
  | Edit title      | edit <id> --title "New title" |
  | Edit priority   | edit <id> --priority high     |
  | Assign          | edit <id> --assign @worker    |
  | Start work      | start <id>                    |
  | Update progress | progress <id> --percent 50    |
  | Complete        | complete <id>                 |
  | Delete          | delete <id>                   |
  | Search          | search "keyword"              |

  Try it:
  taskflow> show 3
  taskflow> start 3
  taskflow> progress 3 --percent 25
  taskflow> list