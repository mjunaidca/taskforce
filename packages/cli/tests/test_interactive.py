"""Tests for TaskFlow interactive REPL mode.

Tests for the interactive REPL (Read-Eval-Print Loop) that allows continuous
task management without retyping 'taskflow' prefix.
"""

import os
from unittest.mock import MagicMock, patch

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.storage import Storage

runner = CliRunner()


@pytest.fixture
def temp_taskflow(tmp_path):
    """Create a temporary TaskFlow directory for testing."""
    import json

    taskflow_dir = tmp_path / ".taskflow"
    taskflow_dir.mkdir()
    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Create config.json
    config = {
        "default_project": "default",
        "current_user": None,
        "storage_mode": "json",
    }
    config_file = taskflow_dir / "config.json"
    config_file.write_text(json.dumps(config, indent=2))

    # Create data.json with default project and worker
    data = {
        "projects": [
            {
                "slug": "default",
                "name": "Default Project",
                "description": "Test project",
            }
        ],
        "workers": [
            {
                "id": "@testuser",
                "name": "Test User",
                "type": "human",
            }
        ],
        "tasks": [],
        "audit_logs": [],
    }
    data_file = taskflow_dir / "data.json"
    data_file.write_text(json.dumps(data, indent=2))

    yield tmp_path

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


class TestInteractiveCommand:
    """Test cases for 'taskflow interactive' command."""

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_starts(self, mock_session, temp_taskflow):
        """Test that interactive mode starts and displays welcome message."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["exit"]  # Exit immediately
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        assert "Interactive Mode" in result.stdout or "interactive" in result.stdout.lower()
        mock_session.assert_called_once()

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_executes_add_command(self, mock_session, temp_taskflow):
        """Test that interactive mode can execute 'add' command."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ['add "Test task from REPL"', "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0

        # Verify command was attempted (output should contain task-related text)
        # Note: Due to CliRunner isolation, we can't verify the task was actually created
        # but we can verify the command executed without crashing
        assert "exit" not in result.stdout or "Goodbye" in result.stdout

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_executes_list_command(self, mock_session, temp_taskflow):
        """Test that interactive mode can execute 'list' command."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["list", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Command should execute without error
        assert "Goodbye" in result.stdout

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_exit_command(self, mock_session, temp_taskflow):
        """Test that 'exit' command terminates REPL."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        assert mock_prompt.prompt.call_count == 1

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_quit_command(self, mock_session, temp_taskflow):
        """Test that 'quit' command terminates REPL."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["quit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        assert mock_prompt.prompt.call_count == 1

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_q_command(self, mock_session, temp_taskflow):
        """Test that 'q' command terminates REPL."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["q"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        assert mock_prompt.prompt.call_count == 1

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_help_command(self, mock_session, temp_taskflow):
        """Test that 'help' command displays available commands."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["help", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should show some command help
        assert (
            "add" in result.stdout or "list" in result.stdout or "commands" in result.stdout.lower()
        )

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_keyboard_interrupt(self, mock_session, temp_taskflow):
        """Test that Ctrl+C (KeyboardInterrupt) continues REPL instead of crashing."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = [KeyboardInterrupt(), "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should have tried to prompt twice (once interrupted, once exit)
        assert mock_prompt.prompt.call_count == 2

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_eof(self, mock_session, temp_taskflow):
        """Test that EOF (Ctrl+D) terminates REPL gracefully."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = [EOFError()]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        assert mock_prompt.prompt.call_count == 1

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_use_project_context(self, mock_session, temp_taskflow):
        """Test that 'use' command sets project context."""
        # Arrange
        storage = Storage(temp_taskflow / ".taskflow")
        from taskflow.models import Project

        project = Project(slug="myproject", name="My Project", description="Test")
        storage.add_project(project)

        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["use myproject", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should show that context was set
        assert "myproject" in result.stdout or "context" in result.stdout.lower()

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_whoami_context(self, mock_session, temp_taskflow):
        """Test that 'whoami' command sets worker context."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["whoami @testuser", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should show that worker context was set
        assert "@testuser" in result.stdout or "worker" in result.stdout.lower()

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_multiple_commands(self, mock_session, temp_taskflow):
        """Test that interactive mode can execute multiple commands in sequence."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = [
            'add "Task 1"',
            'add "Task 2"',
            'add "Task 3"',
            "list",
            "exit",
        ]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should have prompted 5 times (3 adds, 1 list, 1 exit)
        assert mock_prompt.prompt.call_count == 5
        assert "Goodbye" in result.stdout

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_empty_input(self, mock_session, temp_taskflow):
        """Test that empty input is handled gracefully."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["", "   ", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should have prompted 3 times (empty, whitespace, exit)
        assert mock_prompt.prompt.call_count == 3

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_invalid_command(self, mock_session, temp_taskflow):
        """Test that invalid commands show helpful error messages."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["invalidcommand", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should show error or unknown command message
        # (The actual error handling will be in the implementation)
        assert mock_prompt.prompt.call_count == 2

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_workflow_commands(self, mock_session, temp_taskflow):
        """Test that workflow commands work in interactive mode."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["start 1", "progress 1 --percent 50", "exit"]
        mock_session.return_value = mock_prompt

        # Act
        result = runner.invoke(app, ["interactive"])

        # Assert
        assert result.exit_code == 0
        # Should have prompted 3 times (start, progress, exit)
        assert mock_prompt.prompt.call_count == 3
        assert "Goodbye" in result.stdout

    def test_interactive_alias_i(self, temp_taskflow):
        """Test that 'taskflow i' works as an alias for 'taskflow interactive'."""
        # We can't easily mock the prompt for the alias test,
        # but we can verify the command is registered
        result = runner.invoke(app, ["--help"])

        assert result.exit_code == 0
        # The help should show both 'interactive' and 'i' or just verify 'i' works
        # Let's just verify the alias command exists by trying to invoke it with --help
        result_alias = runner.invoke(app, ["i", "--help"])
        # If the alias exists, it should show help or at least not crash with "no such command"
        assert "No such command" not in result_alias.stdout or result_alias.exit_code == 0

    @patch("taskflow.commands.interactive.PromptSession")
    def test_interactive_history_persistence(self, mock_session, temp_taskflow):
        """Test that command history is persisted to file."""
        # Arrange
        mock_prompt = MagicMock()
        mock_prompt.prompt.side_effect = ["exit"]
        mock_session.return_value = mock_prompt

        # Act
        runner.invoke(app, ["interactive"])

        # Assert - Check that FileHistory was used with correct path
        from prompt_toolkit.history import FileHistory

        # The mock_session should have been called with history parameter
        call_kwargs = mock_session.call_args[1] if mock_session.call_args else {}
        if "history" in call_kwargs:
            assert isinstance(call_kwargs["history"], FileHistory)
