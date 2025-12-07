"""TaskFlow CLI entry point.

This module provides the main Typer application that serves as the CLI entry point.
All command modules are registered here.
"""

import typer

from taskflow import __version__
from taskflow.commands import (
    audit,
    demo,
    due,
    init_cmd,
    interactive,
    project,
    status,
    task,
    worker,
    workflow,
)

HELP_TEXT = """TaskFlow - Human-Agent Task Management with Parity

A CLI that proves humans and AI agents can be managed identically in task workflows.

QUICK START:
  taskflow init                         Initialize TaskFlow
  taskflow worker add @sarah            Add a worker
  taskflow add "My first task"          Create a task
  taskflow status                       Check status

COMMON WORKFLOWS:
  Create and assign task:
    taskflow add "Fix bug" --assign @sarah --priority high

  Work on a task:
    taskflow start 1                    Start task
    taskflow progress 1 --percent 50    Update progress
    taskflow complete 1                 Mark complete

  Review workflow:
    taskflow review 1                   Request review
    taskflow approve 1                  Approve task

  Subtasks:
    taskflow add "Main task"
    taskflow subtask 1 "Subtask 1"

LEARN MORE:
  taskflow demo                         Run interactive demo
  taskflow COMMAND --help               Command-specific help
"""

app = typer.Typer(
    name="taskflow",
    help=HELP_TEXT,
    no_args_is_help=True,
)

# Register init command
app.command(name="init")(init_cmd.init)

# Register project commands
app.add_typer(project.app, name="project")

# Register worker commands
app.add_typer(worker.app, name="worker")

# Register audit commands
app.add_typer(audit.app, name="audit")

# Register task commands as top-level commands (add, list, show, edit, delete, subtask, search)
app.command(name="add")(task.add_task)
app.command(name="subtask")(task.add_subtask)
app.command(name="list")(task.list_tasks)
app.command(name="show")(task.show_task)
app.command(name="edit")(task.edit_task)
app.command(name="delete")(task.delete_task)
app.command(name="search")(task.search_tasks)

# Register workflow commands as top-level commands
app.command(name="start")(workflow.start_task)
app.command(name="progress")(workflow.progress_task)
app.command(name="complete")(workflow.complete_task)
app.command(name="review")(workflow.review_task)
app.command(name="approve")(workflow.approve_task)
app.command(name="reject")(workflow.reject_task)
app.command(name="delegate")(workflow.delegate_task)

# Register due date commands as top-level commands
app.command(name="upcoming")(due.upcoming_tasks)
app.command(name="overdue")(due.overdue_tasks)
app.command(name="due")(due.set_due_date)

# Register demo command
app.command(name="demo")(demo.demo)

# Register interactive command
app.command(name="interactive")(interactive.interactive)
app.command(name="i")(interactive.interactive)  # Alias

# Register status command
app.command(name="status")(status.status)


def version_callback(value: bool) -> None:
    """Print version and exit."""
    if value:
        typer.echo(f"TaskFlow CLI v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        help="Show version and exit.",
        callback=version_callback,
        is_eager=True,
    ),
) -> None:
    """TaskFlow - Human-Agent Task Management with Parity.

    A CLI that proves humans and AI agents can be managed identically in task workflows.
    """
    pass


if __name__ == "__main__":
    app()
