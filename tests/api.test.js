const fs = require("fs");
const path = require("path");

// ======================================================
// BASE DE DATOS EXCLUSIVA PARA PRUEBAS
// ======================================================

const testDbPath = path.join(
  __dirname,
  "..",
  "database-test.db"
);

// Eliminar una BD de pruebas anterior
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// app.js leerá esta variable antes de abrir SQLite
process.env.DB_PATH = testDbPath;

const request = require("supertest");

const {
  app,
  db
} = require("../app");

// ======================================================
// AUXILIAR PARA EJECUTAR SQL CON PROMESAS
// ======================================================

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(
      sql,
      params,
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      }
    );
  });
}

// ======================================================
// PREPARAR DATOS ANTES DE CADA PRUEBA
// ======================================================

beforeEach(async () => {
  await run("DELETE FROM productos");
  await run("DELETE FROM categorias");

  await run(`
    DELETE FROM sqlite_sequence
    WHERE name IN ('productos', 'categorias')
  `);

  await run(
    `
      INSERT INTO categorias (nombre)
      VALUES (?)
    `,
    ["Electronica"]
  );

  await run(
    `
      INSERT INTO productos
      (
        nombre,
        precio,
        stock,
        categoria_id
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      "Teclado Base",
      899.99,
      10,
      1
    ]
  );
});

// ======================================================
// CERRAR SQLITE AL TERMINAR
// ======================================================

afterAll(async () => {
  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// ======================================================
// 1. GET /api/productos
// ======================================================

describe("GET /api/productos", () => {
  test("Debe obtener todos los productos", async () => {
    const response =
      await request(app)
        .get("/api/productos");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.statusCode)
      .toBe(200);

    expect(Array.isArray(response.body.data))
      .toBe(true);

    expect(response.body.data.length)
      .toBe(1);

    expect(response.body.data[0].nombre)
      .toBe("Teclado Base");
  });
});

// ======================================================
// 2. GET /api/productos/:id
// ======================================================

describe("GET /api/productos/:id", () => {
  test("Debe obtener un producto existente", async () => {
    const response =
      await request(app)
        .get("/api/productos/1");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.id)
      .toBe(1);

    expect(response.body.data.nombre)
      .toBe("Teclado Base");
  });

  test("Debe devolver 404 con producto inexistente", async () => {
    const response =
      await request(app)
        .get("/api/productos/999");

    expect(response.statusCode)
      .toBe(404);

    expect(response.body.error)
      .toBe("Producto no encontrado");
  });
});

// ======================================================
// 3. POST /api/productos
// ======================================================

describe("POST /api/productos", () => {
  test("Debe registrar un producto correctamente", async () => {
    const response =
      await request(app)
        .post("/api/productos")
        .send({
          nombre: "Mouse Jest",
          precio: 499.99,
          stock: 5,
          categoria_id: 1
        });

    expect(response.statusCode)
      .toBe(201);

    expect(response.body.data.nombre)
      .toBe("Mouse Jest");

    expect(response.body.data.precio)
      .toBe(499.99);
  });

  test("Debe devolver 400 si faltan datos", async () => {
    const response =
      await request(app)
        .post("/api/productos")
        .send({
          nombre: "Producto incompleto"
        });

    expect(response.statusCode)
      .toBe(400);

    expect(response.body.error)
      .toBe("Faltan datos obligatorios");
  });
});

// ======================================================
// 4. PUT /api/productos/:id
// ======================================================

describe("PUT /api/productos/:id", () => {
  test("Debe actualizar un producto existente", async () => {
    const response =
      await request(app)
        .put("/api/productos/1")
        .send({
          nombre: "Teclado Actualizado",
          precio: 999.99,
          stock: 20,
          categoria_id: 1
        });

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.nombre)
      .toBe("Teclado Actualizado");

    expect(response.body.data.stock)
      .toBe(20);
  });

  test("Debe devolver 404 al actualizar un ID inexistente", async () => {
    const response =
      await request(app)
        .put("/api/productos/999")
        .send({
          nombre: "No existe",
          precio: 100,
          stock: 1,
          categoria_id: 1
        });

    expect(response.statusCode)
      .toBe(404);
  });

  test("Debe devolver 400 con datos incompletos", async () => {
    const response =
      await request(app)
        .put("/api/productos/1")
        .send({
          nombre: "Incompleto"
        });

    expect(response.statusCode)
      .toBe(400);
  });
});

// ======================================================
// 5. DELETE /api/productos/:id
// ======================================================

describe("DELETE /api/productos/:id", () => {
  test("Debe eliminar un producto existente", async () => {
    const response =
      await request(app)
        .delete("/api/productos/1");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.mensaje)
      .toBe(
        "Producto eliminado correctamente"
      );
  });

  test("Debe devolver 404 al eliminar producto inexistente", async () => {
    const response =
      await request(app)
        .delete("/api/productos/999");

    expect(response.statusCode)
      .toBe(404);
  });
});

// ======================================================
// 6. GET /api/categorias
// ======================================================

describe("GET /api/categorias", () => {
  test("Debe obtener las categorías", async () => {
    const response =
      await request(app)
        .get("/api/categorias");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.length)
      .toBe(1);

    expect(response.body.data[0].nombre)
      .toBe("Electronica");
  });
});

// ======================================================
// 7. POST /api/categorias
// ======================================================

describe("POST /api/categorias", () => {
  test("Debe crear una categoría", async () => {
    const response =
      await request(app)
        .post("/api/categorias")
        .send({
          nombre: "Computacion"
        });

    expect(response.statusCode)
      .toBe(201);

    expect(response.body.data.nombre)
      .toBe("Computacion");
  });

  test("Debe devolver 400 si falta el nombre", async () => {
    const response =
      await request(app)
        .post("/api/categorias")
        .send({});

    expect(response.statusCode)
      .toBe(400);

    expect(response.body.error)
      .toBe("El nombre es obligatorio");
  });
});

// ======================================================
// 8. PUT /api/categorias/:id
// ======================================================

describe("PUT /api/categorias/:id", () => {
  test("Debe actualizar una categoría", async () => {
    const response =
      await request(app)
        .put("/api/categorias/1")
        .send({
          nombre: "Electronica Actualizada"
        });

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.nombre)
      .toBe(
        "Electronica Actualizada"
      );
  });

  test("Debe devolver 404 para categoría inexistente", async () => {
    const response =
      await request(app)
        .put("/api/categorias/999")
        .send({
          nombre: "No existe"
        });

    expect(response.statusCode)
      .toBe(404);
  });
});

// ======================================================
// 9. DELETE /api/categorias/:id
// ======================================================

describe("DELETE /api/categorias/:id", () => {
  test("Debe eliminar una categoría sin productos", async () => {
    const nueva =
      await request(app)
        .post("/api/categorias")
        .send({
          nombre: "Temporal"
        });

    const id =
      nueva.body.data.id;

    const response =
      await request(app)
        .delete(
          `/api/categorias/${id}`
        );

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.mensaje)
      .toBe(
        "Categoría eliminada correctamente"
      );
  });

  test("Debe devolver 404 para categoría inexistente", async () => {
    const response =
      await request(app)
        .delete("/api/categorias/999");

    expect(response.statusCode)
      .toBe(404);
  });
});

// ======================================================
// 10. GET /api/estadisticas
// ======================================================

describe("GET /api/estadisticas", () => {
  test("Debe devolver las estadísticas de la BD", async () => {
    const response =
      await request(app)
        .get("/api/estadisticas");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.productos)
      .toBe(1);

    expect(response.body.data.categorias)
      .toBe(1);

    expect(response.body.data.stock_total)
      .toBe(10);
  });
});

// ======================================================
// PRUEBAS ADICIONALES PARA AUMENTAR COBERTURA
// ======================================================

// ======================================================
// POST /api/database/backup
// ======================================================

describe("POST /api/database/backup", () => {

  test("Debe crear un respaldo de la base de datos", async () => {

    const response =
      await request(app)
        .post("/api/database/backup");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.statusCode)
      .toBe(200);

    expect(response.body.data.mensaje)
      .toBe("Backup realizado correctamente");

    expect(response.body.data.archivo)
      .toContain("backup-");

    expect(response.body.data.archivo)
      .toContain(".db");

  });

});


// ======================================================
// GET /api/database/backup/:archivo
// ======================================================

describe("GET /api/database/backup/:archivo", () => {

  test("Debe devolver 404 si el backup no existe", async () => {

    const response =
      await request(app)
        .get("/api/database/backup/no-existe.db");

    expect(response.statusCode)
      .toBe(404);

    expect(response.body.error)
      .toBe("Backup no encontrado");

  });


  test("Debe rechazar un archivo que no sea .db", async () => {

    const response =
      await request(app)
        .get("/api/database/backup/archivo.txt");

    expect(response.statusCode)
      .toBe(400);

    expect(response.body.error)
      .toBe("Archivo no válido");

  });

});


// ======================================================
// DELETE /api/database/clear
// ======================================================

describe("DELETE /api/database/clear", () => {

  test("Debe vaciar correctamente la base de datos", async () => {

    const response =
      await request(app)
        .delete("/api/database/clear");

    expect(response.statusCode)
      .toBe(200);

    expect(response.body.data.mensaje)
      .toBe(
        "Base de datos vaciada correctamente"
      );

  });

});