$(document).ready(function () {

    $.ajax({
        url: "/api/list_videogames",
        method: "GET",
        dataType: "json",
        success: function (data) {
            cargarTabla(data);
        },
        error: function (xhr, status, error) {
            console.error("Error al cargar los datos:", error);
        }
    });
    cargarOpcionesFormulario();
});


function cargarTabla(data) {

    const cuerpo = data.map(d => [
        d.id,
        d.Name,
        d.Platform,
        d.Year,
        d.Genre,
        d.Publisher,
        parseFloat(d.NA_Sales).toFixed(2),
        parseFloat(d.EU_Sales).toFixed(2),
        parseFloat(d.JP_Sales).toFixed(2),
        parseFloat(d.Other_Sales).toFixed(2),
        parseFloat(d.Global_Sales).toFixed(2)
    ]);
    console.log(cuerpo);

    $('#tablaJuegos').DataTable({
        data: cuerpo,
        columns: [
            { title: "ID", visible: false },
            { title: "Título", },
            { title: "Plataforma" },
            { title: "Año" },
            { title: "Género" },
            { title: "Editor" },
            { title: "Ventas NA", className: "text-end" },
            { title: "Ventas EU", className: "text-end" },
            { title: "Ventas JP", className: "text-end" },
            { title: "Ventas Otros", className: "text-end" },
            { title: "Ventas Globales", className: "text-end" },
            {
                title: "Acciones",
                orderable: false,
                searchable: false,
                className: "text-center",
                render: function (data, type, row, meta) {
                    const id = row[0]; // si tienes ID, cámbialo por row[0] o como venga del backend
                    return `
                    <button class="btn btn-sm btn-warning btn-editar me-1">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${id}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>`;
                }
            }
        ],
        responsive: true
    });
}


/// cargar combos de filtros
function cargarOpcionesFormulario() {
    $.ajax({
        url: '/api/opciones',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            llenarCombo('#editarPlatform', data.plataformas);
            llenarCombo('#editarGenre', data.generos);
            llenarCombo('#editarPublisher', data.editores);
            llenarCombo('#editarYear', data.anios);

            llenarCombo('#addPlatform', data.plataformas);
            llenarCombo('#addGenre', data.generos);
            llenarCombo('#addPublisher', data.editores);
            llenarCombo('#addYear', data.anios);
        },
        error: function () {
            console.error("Error al cargar combos");
        }
    });
}

function llenarCombo(selector, valores) {
    const select = $(selector);
    select.empty();
    select.append('<option value="">-- Seleccione --</option>');
    valores.forEach(v => {
        select.append(`<option value="${v}">${v}</option>`);
    });
}

//Agregar Registro
$('#formAgregar').on('submit', function (e) {
    e.preventDefault();

    const datos = {
        rank: parseInt(this.rank.value),
        name: this.name.value,
        platform: this.platform.value,
        year: parseInt(this.year.value),
        genre: this.genre.value,
        publisher: this.publisher.value,
        na_sales: parseFloat(this.na_sales.value),
        eu_sales: parseFloat(this.eu_sales.value),
        jp_sales: parseFloat(this.jp_sales.value),
        other_sales: parseFloat(this.other_sales.value),
        global_sales: parseFloat(this.global_sales.value)
    };

    $.ajax({
        url: '/add/videogames',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function (response) {
            $('#modalAgregar').modal('hide');
            $('#formAgregar')[0].reset();
            $('#tablaJuegos').DataTable().destroy(); // Recarga
            cargarDatos(); // Vuelve a cargar la tabla
           // alert(response.mensaje);  
            mostrarToast('🎮 Videojuego agregado con éxito', 'success');
        },
        error: function () {
            alert('Error al guardar el videojuego.');
        }
    });
});


function cargarDatos() {
    $('#loader').removeClass('d-none');
    $.ajax({
        url: "/api/list_videogames",
        method: "GET",
        dataType: "json",
        success: function (data) {
            $('#tablaJuegos').DataTable().clear().destroy();
            cargarTabla(data);
        },
        error: function () {
            alert("Error al cargar datos");
        },
        complete: function () {
            $('#loader').addClass('d-none');
        }
    });
}


// mostrar mensajes
function mostrarToast(mensaje, tipo = 'primary') {
    const toastEl = $('#toastNotificacion');
    const toastBody = $('#toastMensaje');

    toastEl.removeClass('bg-primary bg-success bg-danger bg-warning');
    toastEl.addClass(`bg-${tipo}`);
    toastBody.text(mensaje);

    const toast = new bootstrap.Toast(toastEl[0]);
    toast.show();
}


//// eliminar registro
$('#tablaJuegos').on('click', '.btn-eliminar', function () {
    const id = $(this).data('id');
    if (confirm("¿Estás seguro de eliminar este registro?")) {
        $.ajax({
            url: `/del/videogames/${id}`,
            method: 'DELETE',
            success: function () {
                mostrarToast('❌ Registro eliminado', 'danger');
                
                cargarDatos(); // vuelve a cargar la tabla
            },
            error: function () {
                alert("Error al eliminar");
            }
        });
    }
});


//// editar registro
$('#tablaJuegos').on('click', '.btn-editar', function () {
    const row = $(this).closest('tr');
    const data = $('#tablaJuegos').DataTable().row(row).data();
    console.log(data);
    $('#editarId').val(data[0]);
    $('#editarName').val(data[1]);
    $('#editarPlatform').val(data[2]);
    $('#editarYear').val(data[3]);
    $('#editarGenre').val(data[4]);
    $('#editarPublisher').val(data[5]);
    $('#editarNa').val(data[6]);
    $('#editarEu').val(data[7]);
    $('#editarJp').val(data[8]);
    $('#editarOtros').val(data[9]);
    $('#editarGlobal').val(data[10]);

    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
});


// Guardar Cambios Edicion
$('#formEditar').on('submit', function (e) {
    e.preventDefault();
    const id = $('#editarId').val();

    const datos = {
        rank: parseInt($('#editarRank').val()),
        name: $('#editarName').val(),
        platform: $('#editarPlatform').val(),
        year: parseInt($('#editarYear').val()),
        genre: $('#editarGenre').val(),
        publisher: $('#editarPublisher').val(),
        na_sales: parseFloat($('#editarNa').val()),
        eu_sales: parseFloat($('#editarEu').val()),
        jp_sales: parseFloat($('#editarJp').val()),
        other_sales: parseFloat($('#editarOtros').val()),
        global_sales: parseFloat($('#editarGlobal').val())
    };

    $.ajax({
        url: `/upd/videogames/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function () {
            $('#modalEditar').modal('hide');
            mostrarToast('✏️ Registro actualizado', 'warning');
            cargarDatos();
        },
        error: function () {
            alert('Error al actualizar');
        }
    });
});