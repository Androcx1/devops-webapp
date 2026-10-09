const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// BASE DE DATOS SQLITE
// ======================================================

// Normalmente usa database.db.
// Para Jest podremos indicar otra BD con DB_PATH.
const dbPath =
  process.env.DB_PATH || path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(
      "Error al conectar con SQLite:",
      err.message
    );
  } else {
    console.log(
      "Base de datos SQLite conectada correctamente."
    );
  }
});

db.run("PRAGMA foreign_keys = ON");

// ======================================================
// CREAR TABLAS
// ======================================================

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      categoria_id INTEGER NOT NULL,
      FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON DELETE RESTRICT
    )
  `);
});

// ======================================================
// 1. GET /api/productos
// ======================================================

app.get("/api/productos", (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.nombre,
      p.precio,
      p.stock,
      p.categoria_id,
      c.nombre AS categoria
    FROM productos p
    INNER JOIN categorias c
      ON p.categoria_id = c.id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        data: [],
        error: err.message
      });
    }

    res.status(200).json({
      statusCode: 200,
      data: rows
    });
  });
});

// ======================================================
// 2. GET /api/productos/:id
// ======================================================

app.get("/api/productos/:id", (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.nombre,
      p.precio,
      p.stock,
      p.categoria_id,
      c.nombre AS categoria
    FROM productos p
    INNER JOIN categorias c
      ON p.categoria_id = c.id
    WHERE p.id = ?
  `;

  db.get(
    sql,
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      if (!row) {
        return res.status(404).json({
          statusCode: 404,
          data: [],
          error: "Producto no encontrado"
        });
      }

      res.status(200).json({
        statusCode: 200,
        data: row
      });
    }
  );
});

// ======================================================
// 3. POST /api/productos
// ======================================================

app.post("/api/productos", (req, res) => {
  const {
    nombre,
    precio,
    stock,
    categoria_id
  } = req.body;

  if (
    !nombre ||
    precio === undefined ||
    stock === undefined ||
    !categoria_id
  ) {
    return res.status(400).json({
      statusCode: 400,
      data: [],
      error: "Faltan datos obligatorios"
    });
  }

  const sql = `
    INSERT INTO productos
    (nombre, precio, stock, categoria_id)
    VALUES (?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      nombre,
      precio,
      stock,
      categoria_id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      res.status(201).json({
        statusCode: 201,
        data: {
          id: this.lastID,
          nombre,
          precio,
          stock,
          categoria_id
        }
      });
    }
  );
});

// ======================================================
// 4. DELETE /api/productos/:id
// ======================================================

app.delete(
  "/api/productos/:id",
  (req, res) => {
    db.run(
      "DELETE FROM productos WHERE id = ?",
      [req.params.id],
      function (err) {
        if (err) {
          return res.status(500).json({
            statusCode: 500,
            data: [],
            error: err.message
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            statusCode: 404,
            data: [],
            error: "Producto no encontrado"
          });
        }

        res.status(200).json({
          statusCode: 200,
          data: {
            mensaje:
              "Producto eliminado correctamente"
          }
        });
      }
    );
  }
);

// ======================================================
// 5. GET /api/categorias
// ======================================================

app.get("/api/categorias", (req, res) => {
  db.all(
    "SELECT * FROM categorias",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      res.status(200).json({
        statusCode: 200,
        data: rows
      });
    }
  );
});

// ======================================================
// 6. POST /api/categorias
// ======================================================

app.post(
  "/api/categorias",
  (req, res) => {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({
        statusCode: 400,
        data: [],
        error: "El nombre es obligatorio"
      });
    }

    db.run(
      "INSERT INTO categorias (nombre) VALUES (?)",
      [nombre],
      function (err) {
        if (err) {
          return res.status(500).json({
            statusCode: 500,
            data: [],
            error: err.message
          });
        }

        res.status(201).json({
          statusCode: 201,
          data: {
            id: this.lastID,
            nombre
          }
        });
      }
    );
  }
);

// ======================================================
// 7. DELETE /api/categorias/:id
// ======================================================

app.delete(
  "/api/categorias/:id",
  (req, res) => {
    db.run(
      "DELETE FROM categorias WHERE id = ?",
      [req.params.id],
      function (err) {
        if (err) {
          return res.status(500).json({
            statusCode: 500,
            data: [],
            error: err.message
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            statusCode: 404,
            data: [],
            error: "Categoría no encontrada"
          });
        }

        res.status(200).json({
          statusCode: 200,
          data: {
            mensaje:
              "Categoría eliminada correctamente"
          }
        });
      }
    );
  }
);

// ======================================================
// 8. GET /api/estadisticas
// ======================================================

app.get(
  "/api/estadisticas",
  (req, res) => {
    const sql = `
      SELECT
        (
          SELECT COUNT(*)
          FROM productos
        ) AS productos,

        (
          SELECT COUNT(*)
          FROM categorias
        ) AS categorias,

        (
          SELECT IFNULL(SUM(stock), 0)
          FROM productos
        ) AS stock_total
    `;

    db.get(sql, [], (err, row) => {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      res.status(200).json({
        statusCode: 200,
        data: row
      });
    });
  }
);

// ======================================================
// 9. POST /api/database/backup
// ======================================================

app.post(
  "/api/database/backup",
  (req, res) => {
    try {
      const backupDirectory =
        path.join(
          __dirname,
          "backups"
        );

      if (
        !fs.existsSync(
          backupDirectory
        )
      ) {
        fs.mkdirSync(
          backupDirectory,
          {
            recursive: true
          }
        );
      }

      const fecha =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            "-"
          );

      const nombreBackup =
        `backup-${fecha}.db`;

      const backupPath =
        path.join(
          backupDirectory,
          nombreBackup
        );

      fs.copyFileSync(
        dbPath,
        backupPath
      );

      const downloadUrl =
        `${req.protocol}://${req.get(
          "host"
        )}/api/database/backup/${nombreBackup}`;

      res.status(200).json({
        statusCode: 200,
        data: {
          mensaje:
            "Backup realizado correctamente",
          archivo:
            nombreBackup,
          downloadUrl:
            downloadUrl
        }
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        data: [],
        error: error.message
      });
    }
  }
);

// ======================================================
// PUT /api/productos/:id
// Actualizar producto
// ======================================================

app.put("/api/productos/:id", (req, res) => {
  const {
    nombre,
    precio,
    stock,
    categoria_id
  } = req.body;

  if (
    !nombre ||
    precio === undefined ||
    stock === undefined ||
    !categoria_id
  ) {
    return res.status(400).json({
      statusCode: 400,
      data: [],
      error: "Faltan datos obligatorios"
    });
  }

  const sql = `
    UPDATE productos
    SET
      nombre = ?,
      precio = ?,
      stock = ?,
      categoria_id = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      nombre,
      precio,
      stock,
      categoria_id,
      req.params.id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          statusCode: 404,
          data: [],
          error: "Producto no encontrado"
        });
      }

      res.status(200).json({
        statusCode: 200,
        data: {
          id: Number(req.params.id),
          nombre,
          precio,
          stock,
          categoria_id
        }
      });
    }
  );
});

// ======================================================
// PUT /api/categorias/:id
// Actualizar categoría
// ======================================================

app.put("/api/categorias/:id", (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({
      statusCode: 400,
      data: [],
      error: "El nombre es obligatorio"
    });
  }

  db.run(
    `
      UPDATE categorias
      SET nombre = ?
      WHERE id = ?
    `,
    [
      nombre,
      req.params.id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          data: [],
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          statusCode: 404,
          data: [],
          error: "Categoría no encontrada"
        });
      }

      res.status(200).json({
        statusCode: 200,
        data: {
          id: Number(req.params.id),
          nombre
        }
      });
    }
  );
});

// ======================================================
// DESCARGAR BACKUP
// ======================================================

app.get(
  "/api/database/backup/:archivo",
  (req, res) => {
    const backupDirectory =
      path.join(
        __dirname,
        "backups"
      );

    const archivo =
      path.basename(
        req.params.archivo
      );

    const backupPath =
      path.join(
        backupDirectory,
        archivo
      );

    if (
      !archivo.endsWith(".db")
    ) {
      return res
        .status(400)
        .json({
          statusCode: 400,
          data: [],
          error:
            "Archivo no válido"
        });
    }

    if (
      !fs.existsSync(
        backupPath
      )
    ) {
      return res
        .status(404)
        .json({
          statusCode: 404,
          data: [],
          error:
            "Backup no encontrado"
        });
    }

    res.download(
      backupPath,
      archivo
    );
  }
);

// ======================================================
// 10. DELETE /api/database/clear
// ======================================================

app.delete(
  "/api/database/clear",
  (req, res) => {
    db.serialize(() => {
      db.run(
        "DELETE FROM productos",
        (err) => {
          if (err) {
            return res
              .status(500)
              .json({
                statusCode: 500,
                data: [],
                error:
                  err.message
              });
          }

          db.run(
            "DELETE FROM categorias",
            (err) => {
              if (err) {
                return res
                  .status(500)
                  .json({
                    statusCode: 500,
                    data: [],
                    error:
                      err.message
                  });
              }

              res
                .status(200)
                .json({
                  statusCode: 200,
                  data: {
                    mensaje:
                      "Base de datos vaciada correctamente"
                  }
                });
            }
          );
        }
      );
    });
  }
);



// ======================================================
// EXPORTAR PARA SERVER.JS Y JEST
// ======================================================

module.exports = {
  app,
  db,
  dbPath
};