from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseConnector(ABC):
    """
    Abstract Base Connector defining standard interface for CyberScope Data Sources.
    """

    @abstractmethod
    def validate_connection(self) -> bool:
        """Validate if the connection/input is valid and accessible."""
        pass

    @abstractmethod
    def discover_schema(self) -> Dict[str, Any]:
        """
        Discover fields, data types, sample values, and preview rows.
        Returns a dict compatible with SchemaDiscoveryResponseSchema.
        """
        pass

    @abstractmethod
    def fetch_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch raw records from the data source."""
        pass
