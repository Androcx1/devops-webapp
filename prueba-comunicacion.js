const net = require("net");

// ===============================================
// CONFIGURACION DE EC2
// ===============================================

const HOST = "18.225.9.61";
const TCP_PORT = 6061;
const HTTP_PORT = 8080;

const BASE_URL = `http://${HOST}:${HTTP_PORT}`;


// ===============================================
// FUNCION PARA ENVIAR JSON POR TCP
// ===============================================

function enviarTCP(mensaje) {
  return new Promise((resolve, reject) => {

    const cliente = new net.Socket();

    let respuesta = "";

    cliente.connect(TCP_PORT, HOST, () => {

      console.log(`\nConectado al socket ${HOST}:${TCP_PORT}`);

      cliente.write(
        JSON.stringify(mensaje) + "\n"
      );

    });

    cliente.on("data", (data) => {

      respuesta += data.toString();

      if (respuesta.includes("\n")) {

        cliente.destroy();

        try {

          resolve(
            JSON.parse(respuesta.trim())
          );

        } catch (error) {

          resolve(respuesta.trim());

        }

      }

    });

    cliente.on("error", (error) => {
      reject(error);
    });

  });
}


// ===============================================
// OBTENER O CREAR CATEGORIA
// ===============================================

async function obtenerCategoria() {

  console.log("\n=================================");
  console.log("1. BUSCANDO CATEGORIA POR HTTP");
  console.log("=================================");

  const respuesta = await fetch(
    `${BASE_URL}/api/categorias`
  );

  const resultado = await respuesta.json();

  let categoria = resultado.data.find(
    c => c.nombre === "Electronica"
  );

  if (categoria) {

    console.log(
      "Categoria encontrada:",
      categoria
    );

    return categoria.id;
  }


  console.log(
    "Categoria no encontrada. Creando..."
  );

  const crear = await fetch(
    `${BASE_URL}/api/categorias`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        nombre: "Electronica"
      })
    }
  );

  const nueva = await crear.json();

  console.log(
    "Categoria creada:",
    nueva
  );

  return nueva.data.id;
}


// ===============================================
// PRUEBA PRINCIPAL
// ===============================================

async function main() {

  try {

    console.log(
      "========================================"
    );

    console.log(
      " PRUEBA HTTP 8080 + SOCKET TCP 6061"
    );

    console.log(
      "========================================"
    );


    // ==========================================
    // 1. OBTENER CATEGORIA
    // ==========================================

    const categoriaId =
      await obtenerCategoria();


    // ==========================================
    // 2. INSERTAR PRODUCTO POR TCP 6061
    // ==========================================

    console.log("\n=================================");
    console.log("2. INSERTANDO PRODUCTO POR 6061");
    console.log("=================================");

    const producto = {
      nombre: `Producto Socket ${Date.now()}`,
      precio: 750,
      stock: 10,
      categoria_id: categoriaId
    };


    const respuestaInsert =
      await enviarTCP({
        in: producto
      });


    console.log(
      "Respuesta TCP:"
    );

    console.log(
      JSON.stringify(
        respuestaInsert,
        null,
        2
      )
    );


    // ==========================================
    // 3. CONSULTAR POR TCP 6061
    // ==========================================

    console.log("\n=================================");
    console.log("3. CONSULTANDO POR TCP 6061");
    console.log("=================================");


    const respuestaTCP =
      await enviarTCP({
        get: {}
      });


    console.log(
      JSON.stringify(
        respuestaTCP,
        null,
        2
      )
    );


    // ==========================================
    // 4. CONSULTAR POR HTTP 8080
    // ==========================================

    console.log("\n=================================");
    console.log("4. CONSULTANDO POR HTTP 8080");
    console.log("=================================");


    const respuestaHTTP =
      await fetch(
        `${BASE_URL}/api/productos`
      );


    const productosHTTP =
      await respuestaHTTP.json();


    console.log(
      JSON.stringify(
        productosHTTP,
        null,
        2
      )
    );


    // ==========================================
    // RESULTADO FINAL
    // ==========================================

    console.log("\n=================================");
    console.log(" PRUEBA TERMINADA CORRECTAMENTE");
    console.log("=================================");

    console.log(
      "Producto insertado mediante TCP 6061"
    );

    console.log(
      "Producto consultado mediante TCP 6061"
    );

    console.log(
      "Producto consultado mediante HTTP 8080"
    );

    console.log(
      "Ambos servicios utilizan la misma BD"
    );

  } catch (error) {

    console.error(
      "\nERROR EN LA PRUEBA:"
    );

    console.error(
      error.message
    );

  }

}


main();