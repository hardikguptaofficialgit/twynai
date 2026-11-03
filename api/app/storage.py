"""Private object storage for uploads, with local disk for development."""
from pathlib import Path
from functools import lru_cache

from . import config


@lru_cache(maxsize=1)
def _client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=config.OBJECT_STORAGE_ENDPOINT,
        region_name=config.OBJECT_STORAGE_REGION,
        aws_access_key_id=config.OBJECT_STORAGE_ACCESS_KEY_ID,
        aws_secret_access_key=config.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"total_max_attempts": 3, "mode": "standard"},
            connect_timeout=5,
            read_timeout=20,
        ),
    )


def put(key: str, data: bytes, content_type: str) -> str:
    if config.OBJECT_STORAGE_ENABLED:
        _client().put_object(Bucket=config.OBJECT_STORAGE_BUCKET, Key=key, Body=data, ContentType=content_type)
        return f"object://{key}"
    path = config.UPLOAD_DIR / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path)


def exists(reference: str) -> bool:
    if reference.startswith("object://"):
        from botocore.exceptions import ClientError

        try:
            _client().head_object(Bucket=config.OBJECT_STORAGE_BUCKET, Key=reference[9:])
            return True
        except ClientError as error:
            if error.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
                return False
            raise
    try:
        return _local_path(reference).is_file()
    except ValueError:
        return False


def get(reference: str) -> bytes:
    if reference.startswith("object://"):
        from botocore.exceptions import ClientError

        try:
            response = _client().get_object(Bucket=config.OBJECT_STORAGE_BUCKET, Key=reference[9:])
        except ClientError as error:
            if error.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
                raise FileNotFoundError(reference) from error
            raise
        with response["Body"] as body:
            return body.read()
    return _local_path(reference).read_bytes()


def delete(reference: str) -> None:
    if reference.startswith("object://"):
        _client().delete_object(Bucket=config.OBJECT_STORAGE_BUCKET, Key=reference[9:])
        return
    _local_path(reference).unlink(missing_ok=True)


def presigned_get(reference: str, expires: int = 900, content_type: str = "", filename: str = "") -> str | None:
    """Return a short-lived private-object URL, or None for local development."""
    if not reference.startswith("object://") or not config.OBJECT_STORAGE_ENABLED:
        return None
    params = {"Bucket": config.OBJECT_STORAGE_BUCKET, "Key": reference[9:]}
    if content_type: params["ResponseContentType"] = content_type
    if filename: params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    return _client().generate_presigned_url("get_object", Params=params, ExpiresIn=expires)


def _local_path(reference: str) -> Path:
    path = Path(reference).resolve()
    root = config.UPLOAD_DIR.resolve()
    if not path.is_relative_to(root):
        raise ValueError("Upload path is outside the configured storage directory.")
    return path
