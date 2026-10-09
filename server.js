const net = require("net");

const {
  app,
  db
} = require("./app");

const PORT =
  process.env.PORT || 80;

const SOCKET_PORT =
  process.env.SOCKET_PORT || 6061;

// ======================================================
// SERVICIO SOCKET TCP - PUERTO 6061
// ======================================================

const socketServer =
  net.createServer(
    (socket) => {
      console.log(
        `Cliente TCP conectado: ${socket.remoteAddress}:${socket.remotePort}`
      );

      socket.setEncoding(
        "utf8"
      );

      let buffer = "";

      socket.on(
        "data",
        (chunk) => {
          buffer += chunk;

          let posicion;

          while (
            (
              posicion =
                buffer.indexOf(
                  "\n"
                )
            ) !== -1
          ) {
            const mensajeTexto =
              buffer
                .slice(
                  0,
                  posicion
                )
                .trim();

            buffer =
              buffer.slice(
                posicion + 1
              );

            if (
              !mensajeTexto
            ) {
              continue;
            }

            console.log(
              "TCP recibido:",
              mensajeTexto
            );

            let mensaje;

            try {
              mensaje =
                JSON.parse(
                  mensajeTexto
                );
            } catch (error) {
              socket.write(
                JSON.stringify({
                  statusCode:
                    400,
                  data: [],
                  error:
                    "Formato JSON invalido"
                }) + "\n"
              );

              continue;
            }

            // ==================================================
            // INSERT / IN
            // ==================================================

            const elementoInsertar =
              mensaje.insert ||
              mensaje.in;

            if (
              elementoInsertar
            ) {
              const {
                nombre,
                precio,
                stock,
                categoria_id
              } =
                elementoInsertar;

              if (
                !nombre ||
                precio ===
                  undefined ||
                stock ===
                  undefined ||
                !categoria_id
              ) {
                socket.write(
                  JSON.stringify(
                    {
                      statusCode:
                        400,
                      data: [],
                      error:
                        "Se requieren nombre, precio, stock y categoria_id"
                    }
                  ) + "\n"
                );

                continue;
              }

              const sql = `
                INSERT INTO productos
                (
                  nombre,
                  precio,
                  stock,
                  categoria_id
                )
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
                function (
                  err
                ) {
                  if (
                    err
                  ) {
                    socket.write(
                      JSON.stringify(
                        {
                          statusCode:
                            400,
                          data:
                            [],
                          error:
                            err.message
                        }
                      ) +
                        "\n"
                    );

                    return;
                  }

                  socket.write(
                    JSON.stringify(
                      {
                        statusCode:
                          201,
                        data: {
                          id:
                            this
                              .lastID,
                          nombre,
                          precio,
                          stock,
                          categoria_id
                        }
                      }
                    ) + "\n"
                  );
                }
              );

              continue;
            }

            // ==================================================
            // GET
            // ==================================================

            if (
              Object.prototype
                .hasOwnProperty
                .call(
                  mensaje,
                  "get"
                )
            ) {
              const elemento =
                mensaje.get ||
                {};

              // GET POR ID
              if (
                elemento.id
              ) {
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
                  [
                    elemento.id
                  ],
                  (
                    err,
                    row
                  ) => {
                    if (
                      err
                    ) {
                      socket.write(
                        JSON.stringify(
                          {
                            statusCode:
                              500,
                            data:
                              [],
                            error:
                              err.message
                          }
                        ) +
                          "\n"
                      );

                      return;
                    }

                    if (
                      !row
                    ) {
                      socket.write(
                        JSON.stringify(
                          {
                            statusCode:
                              404,
                            data:
                              [],
                            error:
                              "Elemento no encontrado"
                          }
                        ) +
                          "\n"
                      );

                      return;
                    }

                    socket.write(
                      JSON.stringify(
                        {
                          statusCode:
                            200,
                          data:
                            row
                        }
                      ) +
                        "\n"
                    );
                  }
                );

                continue;
              }

              // GET DE TODOS
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
                ORDER BY p.id
              `;

              db.all(
                sql,
                [],
                (
                  err,
                  rows
                ) => {
                  if (
                    err
                  ) {
                    socket.write(
                      JSON.stringify(
                        {
                          statusCode:
                            500,
                          data:
                            [],
                          error:
                            err.message
                        }
                      ) +
                        "\n"
                    );

                    return;
                  }

                  socket.write(
                    JSON.stringify(
                      {
                        statusCode:
                          200,
                        data:
                          rows
                      }
                    ) +
                      "\n"
                  );
                }
              );

              continue;
            }

            // ==================================================
            // OPERACIÓN DESCONOCIDA
            // ==================================================

            socket.write(
              JSON.stringify({
                statusCode:
                  400,
                data: [],
                error:
                  "Operacion no valida. Use in, insert o get."
              }) + "\n"
            );
          }
        }
      );

      socket.on(
        "end",
        () => {
          console.log(
            "Cliente TCP desconectado"
          );
        }
      );

      socket.on(
        "error",
        (error) => {
          console.error(
            "Error en cliente TCP:",
            error.message
          );
        }
      );
    }
  );

// ======================================================
// INICIAR SOCKET TCP
// ======================================================

socketServer.listen(
  SOCKET_PORT,
  "0.0.0.0",
  () => {
    console.log(
      "======================================="
    );

    console.log(
      `Socket TCP ejecutandose en puerto ${SOCKET_PORT}`
    );

    console.log(
      "Operaciones disponibles: in, insert, get"
    );

    console.log(
      "======================================="
    );
  }
);

// ======================================================
// INICIAR SERVIDOR HTTP
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "======================================="
    );

    console.log(
      " DEVOPS WEB APP"
    );

    console.log(
      "======================================="
    );

    console.log(
      `Servidor ejecutándose en puerto ${PORT}`
    );

    console.log(
      "Base de datos: SQLite"
    );

    console.log(
      "Endpoints disponibles: 10"
    );

    console.log(
      "======================================="
    );
  }
);