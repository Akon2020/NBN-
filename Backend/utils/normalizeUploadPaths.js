export const normalizeUploadPaths = (req, res, next) => {
  if (req.file) {
    req.file.path = req.file.path.replace(/\\/g, "/");
  }

  if (req.files) {
    // multer.array() -> req.files est un tableau ; multer.fields() ->
    // req.files est un objet {fieldname: File[]}. Les deux formes doivent
    // être normalisées.
    if (Array.isArray(req.files)) {
      req.files.forEach((file) => {
        file.path = file.path.replace(/\\/g, "/");
      });
    } else {
      Object.keys(req.files).forEach((field) => {
        req.files[field].forEach((file) => {
          file.path = file.path.replace(/\\/g, "/");
        });
      });
    }
  }

  next();
};
