"""
State Manager
=============

Manages state persistence and retrieval for workflows and agents.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json
import asyncio
from pathlib import Path


class StateManager:
    """
    Manages state for workflows and agents.

    Features:
    - State persistence
    - State retrieval
    - State versioning
    - State cleanup
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path or "./state_storage")
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self.state_cache: Dict[str, Dict[str, Any]] = {}

    async def save_state(
        self,
        workflow_id: str,
        state: Dict[str, Any],
        version: Optional[str] = None
    ) -> str:
        """
        Save workflow state.

        Args:
            workflow_id: Workflow identifier
            state: State to save
            version: Optional version identifier

        Returns:
            State ID
        """
        timestamp = datetime.now()
        state_id = f"{workflow_id}_{timestamp.timestamp()}"

        if version:
            state_id = f"{state_id}_{version}"

        # Add metadata
        state_with_meta = {
            "state_id": state_id,
            "workflow_id": workflow_id,
            "version": version,
            "timestamp": timestamp.isoformat(),
            "state": state
        }

        # Save to cache
        self.state_cache[state_id] = state_with_meta

        # Save to disk
        await self._write_to_disk(state_id, state_with_meta)

        return state_id

    async def load_state(self, state_id: str) -> Optional[Dict[str, Any]]:
        """
        Load workflow state.

        Args:
            state_id: State identifier

        Returns:
            State dictionary or None if not found
        """
        # Check cache first
        if state_id in self.state_cache:
            return self.state_cache[state_id]["state"]

        # Load from disk
        state_data = await self._read_from_disk(state_id)

        if state_data:
            # Update cache
            self.state_cache[state_id] = state_data
            return state_data["state"]

        return None

    async def get_workflow_history(
        self,
        workflow_id: str,
        limit: int = 10
    ) -> list[Dict[str, Any]]:
        """
        Get workflow execution history.

        Args:
            workflow_id: Workflow identifier
            limit: Maximum number of records

        Returns:
            List of state records
        """
        # Get all states for workflow
        workflow_states = [
            state for state_id, state in self.state_cache.items()
            if state["workflow_id"] == workflow_id
        ]

        # Sort by timestamp (most recent first)
        sorted_states = sorted(
            workflow_states,
            key=lambda x: x["timestamp"],
            reverse=True
        )

        return sorted_states[:limit]

    async def cleanup_old_states(self, days: int = 7) -> int:
        """
        Clean up old states.

        Args:
            days: Delete states older than this many days

        Returns:
            Number of states deleted
        """
        cutoff = datetime.now().timestamp() - (days * 24 * 60 * 60)
        deleted_count = 0

        states_to_delete = []
        for state_id, state_data in self.state_cache.items():
            state_timestamp = datetime.fromisoformat(state_data["timestamp"]).timestamp()
            if state_timestamp < cutoff:
                states_to_delete.append(state_id)

        # Delete from cache
        for state_id in states_to_delete:
            del self.state_cache[state_id]
            deleted_count += 1

        # Delete from disk
        await self._delete_from_disk(states_to_delete)

        return deleted_count

    async def _write_to_disk(self, state_id: str, state_data: Dict[str, Any]) -> None:
        """Write state to disk."""
        file_path = self.storage_path / f"{state_id}.json"

        def write():
            with open(file_path, "w") as f:
                json.dump(state_data, f, indent=2)

        await asyncio.to_thread(write)

    async def _read_from_disk(self, state_id: str) -> Optional[Dict[str, Any]]:
        """Read state from disk."""
        file_path = self.storage_path / f"{state_id}.json"

        if not file_path.exists():
            return None

        def read():
            with open(file_path, "r") as f:
                return json.load(f)

        return await asyncio.to_thread(read)

    async def _delete_from_disk(self, state_ids: list[str]) -> None:
        """Delete states from disk."""
        def delete():
            for state_id in state_ids:
                file_path = self.storage_path / f"{state_id}.json"
                if file_path.exists():
                    file_path.unlink()

        await asyncio.to_thread(delete)

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Statistics dictionary
        """
        return {
            "cached_states": len(self.state_cache),
            "storage_path": str(self.storage_path),
            "oldest_state": min(
                (state["timestamp"] for state in self.state_cache.values()),
                default=None
            ),
            "newest_state": max(
                (state["timestamp"] for state in self.state_cache.values()),
                default=None
            )
        }
