from pydantic import BaseModel, Field


class RosterColumnItem(BaseModel):
    column_key: str
    label: str
    sort_order: int
    created_at: str | None = None


class RosterRowItem(BaseModel):
    phone: str
    display_name: str | None = None
    username: str | None = None
    status: str | None = None
    last_synced_at: str | None = None
    imported_at: str | None = None
    custom_fields: dict[str, str] = Field(default_factory=dict)


class RosterData(BaseModel):
    database_enabled: bool
    columns: list[RosterColumnItem] = Field(default_factory=list)
    rows: list[RosterRowItem] = Field(default_factory=list)


class CreateRosterColumnRequest(BaseModel):
    label: str = Field(min_length=1, max_length=128)


class RenameRosterColumnRequest(BaseModel):
    label: str = Field(min_length=1, max_length=128)


class PatchRosterRowRequest(BaseModel):
    fields: dict[str, str] = Field(default_factory=dict)


class RosterImportRow(BaseModel):
    phone: str = Field(min_length=1, max_length=32)
    fields: dict[str, str] = Field(default_factory=dict)


class RosterImportRequest(BaseModel):
    new_column_labels: list[str] = Field(default_factory=list)
    rows: list[RosterImportRow] = Field(default_factory=list)


class RosterImportResult(BaseModel):
    updated_phones: int = 0
    new_columns: int = 0