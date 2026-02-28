# Map Debug Checklist

- Confirm whether the frontend calls `/api/geocode` or an external geocoder directly
- Check query normalization and fallback behavior
- Check cache hit, miss, and negative-cache behavior
- Check whether duplicate requests are deduped
- Check whether the page remains responsive while geocoding
- Distinguish CORS, upstream slowness, and local request amplification
