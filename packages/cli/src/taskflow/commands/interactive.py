"""Interactive REPL mode for TaskFlow.

Provides a Read-Eval-Print Loop (REPL) interface for continuous task management
without retyping 'taskflow' prefix.

Features:
- Execute any taskflow command without prefix
- Context awareness (current project, current worker)
- Command history with up/down arrows
- Exit with 'exit', 'quit', or Ctrl+D
"""

import shlex
from pathlib import Path

from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
from rich.console import Console

from taskflow.utils import get_storage

console = Console()


class InteractiveContext:
    """Context for interactive mode - tracks current project and worker."""

    def __init__(self):
        self.project: str | None = None
        self.worker: str | None = None

    def get_prompt(self) -> str:
        """Get the prompt string with current context."""
        if self.project or self.worker:
            context_parts = []
            if self.project:
                context_parts.append(self.project)
            if self.worker:
                context_parts.append(self.worker)
            context = "/".join(context_parts)
            return f"taskflow [{context}]> "
        return "taskflow> "


def interactive() -> None:
    """Interactive REPL mode for TaskFlow.

    Start an interactive session where you can execute taskflow commands
    without typing 'taskflow' prefix each time.

    Commands:
        - Any taskflow command (without 'taskflow' prefix)
        - use <project>    - Set current project context
        - whoami <worker>  - Set current worker context
        - help             - Show available commands
        - exit, quit, q    - Exit interactive mode

    Examples:
        taskflow> add "New task"
        taskflow> list
        taskflow> use myproject
        taskflow [myproject]> whoami @sarah
        taskflow [myproject/@sarah]> start 1
        taskflow [myproject/@sarah]> exit
    """
    # Initialize console and context
    ctx = InteractiveContext()

    # Set up history file in .taskflow directory
    try:
        storage = get_storage()
        history_file = storage.taskflow_dir / "history.txt"
    except Exception:
        # Fallback if storage not initialized - use current directory
        from taskflow.config import get_taskflow_dir

        taskflow_dir = get_taskflow_dir()
        taskflow_dir.mkdir(exist_ok=True)
        history_file = taskflow_dir / "history.txt"

    # Create session with history
    session: PromptSession = PromptSession(history=FileHistory(str(history_file)))

    # Display welcome message
    console.print("\n[bold cyan]TaskFlow Interactive Mode[/bold cyan]")
    console.print("Type commands without 'taskflow' prefix. Type 'exit' to quit.\n")

    # Main REPL loop
    while True:
        try:
            # Get input from user
            command_line = session.prompt(ctx.get_prompt())

            # Skip empty input
            if not command_line.strip():
                continue

            # Parse command
            command = command_line.strip().lower()

            # Check for exit commands
            if command in ("exit", "quit", "q"):
                console.print("[dim]Goodbye![/dim]")
                break

            # Handle special interactive commands
            if command.startswith("use "):
                # Set project context
                project_slug = command_line.strip()[4:].strip()
                if project_slug:
                    ctx.project = project_slug
                    console.print(f"[green]Switched to project:[/green] {project_slug}")
                else:
                    console.print("[red]Usage:[/red] use <project>")
                continue

            if command.startswith("whoami "):
                # Set worker context
                worker_id = command_line.strip()[7:].strip()
                if worker_id:
                    ctx.worker = worker_id
                    console.print(f"[green]Set worker context:[/green] {worker_id}")
                else:
                    console.print("[red]Usage:[/red] whoami <worker>")
                continue

            if command == "whoami":
                # Show current worker context
                if ctx.worker:
                    console.print(f"[cyan]Current worker:[/cyan] {ctx.worker}")
                else:
                    console.print("[dim]No worker context set. Use:[/dim] whoami <worker>")
                continue

            if command == "help":
                # Show help
                show_interactive_help()
                continue

            # Execute the command via typer
            execute_taskflow_command(command_line.strip())

        except KeyboardInterrupt:
            # Ctrl+C - don't exit, just continue to next prompt
            console.print()
            continue

        except EOFError:
            # Ctrl+D - exit gracefully
            console.print("\n[dim]Goodbye![/dim]")
            break

        except Exception as e:
            # Catch all other errors and display them
            console.print(f"[red]Error:[/red] {e}")
            continue


def execute_taskflow_command(command_line: str) -> None:
    """Execute a taskflow command within the interactive session.

    Args:
        command_line: The command line to execute (without 'taskflow' prefix)
    """
    # Import the main app here to avoid circular imports
    from typer.testing import CliRunner

    from taskflow.main import app

    # Parse the command line into args
    try:
        args = shlex.split(command_line)
    except ValueError as e:
        console.print(f"[red]Invalid command syntax:[/red] {e}")
        return

    if not args:
        return

    # Use CliRunner to execute the command in a controlled environment
    runner = CliRunner()

    try:
        result = runner.invoke(app, args)

        # Print the output
        if result.stdout:
            print(result.stdout, end="")

        # Handle errors
        if result.exit_code not in (0, None):
            if result.stderr:
                console.print(f"[red]{result.stderr}[/red]", end="")
            if not result.stdout and not result.stderr:
                console.print(f"[red]Command failed with exit code {result.exit_code}[/red]")

    except Exception as e:
        console.print(f"[red]Error executing command:[/red] {e}")


def show_interactive_help() -> None:
    """Display help for interactive mode commands."""
    console.print("\n[bold cyan]Interactive Mode Commands:[/bold cyan]\n")

    console.print("[bold]Task Management:[/bold]")
    console.print("  add <title> [options]     - Add a new task")
    console.print("  list [options]            - List tasks")
    console.print("  show <id>                 - Show task details")
    console.print("  start <id>                - Start working on a task")
    console.print("  progress <id> --percent N - Update task progress")
    console.print("  complete <id>             - Mark task as complete")
    console.print("  delegate <id> <worker>    - Delegate task to worker")

    console.print("\n[bold]Project & Worker Management:[/bold]")
    console.print("  project add <slug> --name <name>  - Add a project")
    console.print("  project list                      - List projects")
    console.print("  worker add <id> --name <name>     - Add a worker")
    console.print("  worker list                       - List workers")

    console.print("\n[bold]Interactive Commands:[/bold]")
    console.print("  use <project>             - Set current project context")
    console.print("  whoami [worker]           - Show/set current worker context")
    console.print("  help                      - Show this help")
    console.print("  exit, quit, q             - Exit interactive mode")

    console.print("\n[bold]Audit & Search:[/bold]")
    console.print("  audit show <task_id>      - Show audit trail for task")
    console.print("  search <query>            - Search tasks")

    console.print("\n[dim]Tip: Press Ctrl+C to cancel, Ctrl+D or 'exit' to quit[/dim]\n")
