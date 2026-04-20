const http = require("http");
const fs = require("fs");
const path = require("path");
const mime = require("mime");

const cache = {};

const servidor = http.createServer((pedido, respuesta) => {
  const url = new URL("http://localhost:8885" + pedido.url);
  const metodo = pedido.method;
  const ruta = url.pathname;

  if (metodo === "POST" && ruta === "/guardar") {
    return guardarNoticia(pedido, respuesta);
  } else if (metodo === "GET" && ruta === "/") {
    return listarNoticias(respuesta);
  } else if (metodo === "GET" && ruta === "/noticia") {
    return detalleNoticia(url, respuesta);
  } else {
    return servirArchivosEstaticos(ruta, respuesta);
  }
});

function servirArchivosEstaticos(ruta, respuesta) {
  let camino = "public" + ruta;
  if (ruta === "/formulario") camino = "public/formulario.html";

  const tipoMime = mime.getType(camino) || "text/plain";

  if (cache[camino]) {
    respuesta.writeHead(200, { "Content-Type": tipoMime });
    console.log("Sirviendo desde caché: " + camino);
    return respuesta.end(cache[camino]);
  }

  fs.stat(camino, (errorStat) => {
    if (errorStat) {
      respuesta.writeHead(404, { "Content-Type": "text/plain" });
      respuesta.end("404: No se encontró");
    } else {
      fs.readFile(camino, (errorLectura, contenido) => {
        if (!errorLectura) {
          cache[camino] = contenido;
          respuesta.writeHead(200, { "Content-Type": tipoMime });
          respuesta.end(contenido);
        } else {
          respuesta.writeHead(500, { "Content-Type": "text/plain" });
          respuesta.end("500: Error interno");
        }
      });
    }
  });
}

function guardarNoticia(pedido, respuesta) {
  let cuerpo = "";
  pedido.on("data", (chunk) => {
    cuerpo += chunk;
  });

  pedido.on("end", () => {
    const datos = new URLSearchParams(cuerpo);
    const titulo = datos.get("titulo");
    const contenido = datos.get("contenido");
    const linea = `Título: ${titulo} | Contenido: ${contenido}\n`;

    fs.appendFile("noticias.txt", linea, (error) => {
      if (error) {
        respuesta.writeHead(500, { "Content-Type": "text/plain" });
        respuesta.end("Error al guardar");
      } else {
        respuesta.writeHead(302, { Location: "/" });
        respuesta.end();
      }
    });
  });
}

function listarNoticias(respuesta) {
  fs.readFile("public/index.html", "utf-8", (errorHtml, plantilla) => {
    if (errorHtml) {
      respuesta.writeHead(500, { "Content-Type": "text/plain" });
      respuesta.end("500: Error al cargar la plantilla");
    } else {
      fs.readFile("noticias.txt", "utf-8", (errorTxt, datos) => {
        if (errorTxt) {
          respuesta.writeHead(500, { "Content-Type": "text/plain" });
          respuesta.end("500: Error interno");
        } else {
          let muestra = datos;
          if (datos === "") {
            muestra = "Todavia no hay noticias publicadas";
          }

          const htmlFinal = plantilla.replace("{{NOTICIAS}}", muestra);
          respuesta.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
          });
          respuesta.end(htmlFinal);
        }
      });
    }
  });
}

function detalleNoticia(url, respuesta) {
  const id = url.searchParams.get("id");
  fs.readFile("public/index.html", "utf-8", (errorHtml, plantilla) => {
    fs.readFile("noticias.txt", "utf-8", (errorTxt, datos) => {
      if (errorTxt || !datos) {
        return respuesta.end("No hay noticias");
      }
      const lineas = datos.trim().split("\n");
      const noticiaElegida = lineas[id] || "Noticia no encontrada";

      const htmlFinal = plantilla.replace(
        "{{NOTICIAS}}",
        `<h3>Detalle</h3><p>${noticiaElegida}</p><a href="/">Volver</a>`,
      );

      respuesta.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      respuesta.end(htmlFinal);
    });
  });
}

servidor.listen(8885, () => {
  console.log("Servidor iniciado en http://localhost:8885");
});
