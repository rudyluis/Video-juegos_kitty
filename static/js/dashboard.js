// Variables globales
const csvUrl = "https://raw.githubusercontent.com/rudyluis/DashboardJS/refs/heads/main/video_games_sales.csv";
let allData = [];
let filteredData = [];
let initialDataLoaded = false;

// Paleta de colores para gráficos - Tema de Gaming Retro
const chartColors = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  success: '#95E1D3',
  warning: '#FCE38A',
  danger: '#F38181',
  purple: '#A8E6CF',
  pink: '#DCEDC1',
  teal: '#FFD3B6',
  indigo: '#FFAAA5',
  
  getColorArray: function(count) {
    const baseColors = [
      this.primary, this.secondary, this.accent, this.purple, 
      this.pink, this.teal, this.indigo, this.warning, 
      this.danger, this.success
    ];
    
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    } else {
      const colors = [...baseColors];
      for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.5) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
      }
      return colors;
    }
  },
  
  withOpacity: function(color, opacity) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color.replace(/rgba?\(([^)]+)\)/, `rgba($1, ${opacity})`);
  }
};

// Formatear números
function formatNumber(num, precision = 2) {
  if (num === null || num === undefined) return '-';
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(precision) + 'B';
  } else if (absNum >= 1000000) {
    return (num / 1000000).toFixed(precision) + 'M';
  } else if (absNum >= 1000) {
    return (num / 1000).toFixed(precision) + 'K';
  } else {
    return num.toFixed(precision);
  }
}

// Ordenar objeto por valores
function sortObjectByValues(obj, limit = null, ascending = false) {
  let items = Object.entries(obj);
  items.sort((a, b) => ascending ? a[1] - b[1] : b[1] - a[1]);
  
  if (limit !== null && items.length > limit) {
    items = items.slice(0, limit);
  }
  
  const sortedObj = {};
  items.forEach(([key, value]) => {
    sortedObj[key] = value;
  });
  
  return sortedObj;
}

// Opciones de gráficos con tema retro
function getChartOptions(type, isDarkMode) {
  const textColor = isDarkMode ? '#F3F4F6' : '#333';
  const gridColor = isDarkMode ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.15)';
  
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: {
            family: "'Press Start 2P', cursive",
            size: 10
          }
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1F2937' : '#FFF',
        titleColor: isDarkMode ? textColor : '#333',
        bodyColor: isDarkMode ? textColor : '#333',
        borderColor: chartColors.primary,
        borderWidth: 2,
        padding: 10,
        cornerRadius: 8,
        titleFont: {
          family: "'Press Start 2P', cursive",
          size: 12
        },
        bodyFont: {
          family: "'Montserrat', sans-serif",
          size: 12
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            label += formatNumber(context.raw) + 'M';
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          font: {
            family: "'Press Start 2P', cursive",
            size: 8
          }
        },
        grid: {
          color: gridColor,
          drawBorder: false
        }
      },
      y: {
        ticks: {
          color: textColor,
          font: {
            family: "'Press Start 2P', cursive",
            size: 8
          }
        },
        grid: {
          color: gridColor,
          drawBorder: false
        }
      }
    }
  };
  
  switch (type) {
    case 'bar':
    case 'horizontalBar':
      return {
        ...baseOptions,
        indexAxis: type === 'horizontalBar' ? 'y' : 'x',
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...baseOptions.plugins.legend,
            display: false
          }
        }
      };
      
    case 'pie':
    case 'doughnut':
    case 'polarArea':
      return {
        ...baseOptions,
        scales: {},
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...baseOptions.plugins.legend,
            position: 'right'
          }
        }
      };
      
      
    case 'line':
      return {
        ...baseOptions,
        elements: {
          line: {
            tension: 0.2,
            borderWidth: 3
          },
          point: {
            radius: 4,
            hoverRadius: 6,
            borderWidth: 2,
            backgroundColor: chartColors.primary
          }
        }
      };
      
    case 'radar':
      return {
        ...baseOptions,
        scales: {
          r: {
            angleLines: {
              color: gridColor
            },
            grid: {
              color: gridColor
            },
            pointLabels: {
              color: textColor,
              font: {
                family: "'Press Start 2P', cursive",
                size: 8
              }
            },
            ticks: {
              color: textColor,
              backdropColor: isDarkMode ? '#1F2937' : '#FFF'
            }
          }
        }
      };
      
    default:
      return baseOptions;
  }
}

// Almacenar instancias de gráficos
const chartInstances = {};

// Document ready
$(document).ready(function() {
  loadData();
  setupEventListeners();
  setupThemeToggle();
  
  // Cargar preferencia de tema desde localStorage si existe
  const savedTheme = localStorage.getItem('gamesDashboardTheme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    updateThemeToggleUI(savedTheme === 'dark');
  }
});

// Cargar datos
function loadData() {
  $.ajax({
    url: csvUrl,
    dataType: 'text',
    success: function(data) {
      const parsed = Papa.parse(data, {header: true});
      
      allData = parsed.data
        .filter(d => d.Name)
        .map(game => ({
          ...game,
          NA_Sales: parseFloat(game.NA_Sales || 0),
          EU_Sales: parseFloat(game.EU_Sales || 0),
          JP_Sales: parseFloat(game.JP_Sales || 0),
          Other_Sales: parseFloat(game.Other_Sales || 0),
          Global_Sales: parseFloat(game.Global_Sales || 0),
          Year: game.Year ? String(game.Year).trim() : 'N/A'
        }));
      
      filteredData = [...allData];
      initialDataLoaded = true;
      
      initializeFilters();
      updateDashboard();
    },
    error: function(error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.");
    }
  });
}

// Configurar escuchadores de eventos
function setupEventListeners() {
  $('#filterPlatform, #filterGenre, #filterPublisher, #filterYear').on('change', function() {
    if (initialDataLoaded) {
      applyFilters();
    }
  });
  
  $('#resetFilters').on('click', function() {
    $('#filterPlatform, #filterGenre, #filterPublisher, #filterYear').val('');
    if (initialDataLoaded) {
      applyFilters();
    }
  });
  
  $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function() {
    Object.values(chartInstances).forEach(chart => {
      if (chart) chart.update();
    });
  });
}

// Configurar cambio de tema
function setupThemeToggle() {
  $('#toggleTheme').on('click', function() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    // Guardar preferencia en localStorage
    localStorage.setItem('gamesDashboardTheme', newTheme);
    
    html.setAttribute('data-bs-theme', newTheme);
    updateThemeToggleUI(!isDark);
    
    updateCharts(filteredData);
  });
}

// Actualizar UI del botón de tema
function updateThemeToggleUI(isDark) {
  $('.mode-icon').text(isDark ? '☀️' : '🌙');
  $('.mode-text').text(isDark ? 'Modo Claro' : 'Modo Oscuro');
}

// Inicializar filtros
function initializeFilters() {
  const $platformSelect = $('#filterPlatform');
  const $genreSelect = $('#filterGenre');
  const $publisherSelect = $('#filterPublisher');
  const $yearSelect = $('#filterYear');
  
  const populateSelect = (select, values) => {
    select.empty().append('<option value="">Todos</option>');
    values.forEach(value => {
      select.append($('<option></option>').attr('value', value).text(value));
    });
  };
  
  const uniquePlatforms = [...new Set(allData.map(d => d.Platform).filter(Boolean))].sort();
  const uniqueGenres = [...new Set(allData.map(d => d.Genre).filter(Boolean))].sort();
  const uniquePublishers = [...new Set(allData.map(d => d.Publisher).filter(Boolean))].sort();
  
  const uniqueYears = [...new Set(allData.map(d => d.Year).filter(year => year && year !== 'N/A'))]
    .sort((a, b) => parseInt(a) - parseInt(b));
  
  populateSelect($platformSelect, uniquePlatforms);
  populateSelect($genreSelect, uniqueGenres);
  populateSelect($publisherSelect, uniquePublishers);
  populateSelect($yearSelect, uniqueYears);
}

// Aplicar filtros
function applyFilters() {
  const platform = $('#filterPlatform').val();
  const genre = $('#filterGenre').val();
  const publisher = $('#filterPublisher').val();
  const year = $('#filterYear').val();
  
  filteredData = allData.filter(game => 
    (!platform || game.Platform === platform) &&
    (!genre || game.Genre === genre) &&
    (!publisher || game.Publisher === publisher) &&
    (!year || game.Year === year)
  );
  
  updateDashboard();
}

// Actualizar dashboard
function updateDashboard() {
  updateStats();
  updateCharts(filteredData);
  updateDataTable(filteredData);
}

// Actualizar estadísticas
function updateStats() {
  $('#totalGames').text(filteredData.length.toLocaleString());
  
  const totalSales = filteredData.reduce((sum, game) => sum + game.Global_Sales, 0);
  $('#totalSales').text(formatNumber(totalSales) + 'M');
  
  const platformSales = {};
  const genreSales = {};
  const publisherSales = {};
  
  filteredData.forEach(game => {
    platformSales[game.Platform] = (platformSales[game.Platform] || 0) + game.Global_Sales;
    genreSales[game.Genre] = (genreSales[game.Genre] || 0) + game.Global_Sales;
    publisherSales[game.Publisher] = (publisherSales[game.Publisher] || 0) + game.Global_Sales;
  });
  
  const topPlatform = Object.entries(platformSales).sort((a, b) => b[1] - a[1])[0];
  const topGenre = Object.entries(genreSales).sort((a, b) => b[1] - a[1])[0];
  const topPublisher = Object.entries(publisherSales).sort((a, b) => b[1] - a[1])[0];
  
  $('#topPlatform').text(topPlatform ? topPlatform[0] : '-');
  $('#topGenre').text(topGenre ? topGenre[0] : '-');
  $('#topPublisher').text(topPublisher ? topPublisher[0] : '-');
}

// Actualizar tabla de datos
function updateDataTable(data) {
  const table = $('#gamesTable').DataTable();
  if (table) {
    table.clear().destroy();
  }
  
  $('#gamesTable').DataTable({
    data: data.map(game => [
      game.Name,
      game.Platform,
      game.Year,
      game.Genre,
      game.Publisher,
      formatNumber(game.NA_Sales, 2),
      formatNumber(game.EU_Sales, 2),
      formatNumber(game.JP_Sales, 2),
      formatNumber(game.Other_Sales, 2),
      formatNumber(game.Global_Sales, 2)
    ]),
    columns: [
      { title: "Nombre" },
      { title: "Plataforma" },
      { title: "Año" },
      { title: "Género" },
      { title: "Editorial" },
      { title: "Ventas NA", className: "text-end" },
      { title: "Ventas UE", className: "text-end" },
      { title: "Ventas JP", className: "text-end" },
      { title: "Otras Ventas", className: "text-end" },
      { title: "Ventas Globales", className: "text-end" }
    ],
    responsive: true,
    order: [[9, 'desc']],
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    language: {
      search: "Buscar:",
      lengthMenu: "Mostrar _MENU_ entradas",
      info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
      infoEmpty: "Mostrando 0 a 0 de 0 entradas",
      infoFiltered: "(filtrado de _MAX_ entradas totales)",
      paginate: {
        first: "Primero",
        last: "Último",
        next: "Siguiente",
        previous: "Anterior"
      },
      emptyTable: "No hay datos disponibles",
      zeroRecords: "No se encontraron coincidencias"
    }
  });
}

// Actualizar todos los gráficos
function updateCharts(data) {
  const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  
  Object.keys(chartInstances).forEach(id => {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      chartInstances[id] = null;
    }
  });
  
  createRegionSalesBarChart(data, isDarkMode);
  createPublisherPieChart(data, isDarkMode);
  createYearlyTrendChart(data, isDarkMode);
  createPlatformBarChart(data, isDarkMode);
  createPlatformDoughnutChart(data, isDarkMode);
  createGenreRadarChart(data, isDarkMode);
  createGenrePieChart(data, isDarkMode);
  createRegionComparisonChart(data, isDarkMode);
  createGenrePolarAreaChart(data, isDarkMode);
  createPublisherHorizontalBarChart(data, isDarkMode);
}

// Gráfico de Barras de Ventas por Región
function createRegionSalesBarChart(data, isDarkMode) {
  const ctx = document.getElementById('regionSalesBar').getContext('2d');
  
  const regionSales = {
    'Norteamérica': data.reduce((sum, game) => sum + game.NA_Sales, 0),
    'Europa': data.reduce((sum, game) => sum + game.EU_Sales, 0),
    'Japón': data.reduce((sum, game) => sum + game.JP_Sales, 0),
    'Otras Regiones': data.reduce((sum, game) => sum + game.Other_Sales, 0)
  };
  
  const options = getChartOptions('bar', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Ventas por Región (Millones)',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.regionSalesBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(regionSales),
      datasets: [{
        label: 'Ventas (Millones)',
        data: Object.values(regionSales),
        backgroundColor: chartColors.getColorArray(4),
        borderWidth: 2,
        borderColor: chartColors.primary,
        borderRadius: 4
      }]
    },
    options: options
  });
}

// Gráfico Circular de Editoriales
function createPublisherPieChart(data, isDarkMode) {
  const ctx = document.getElementById('overviewPie').getContext('2d');
  
  const publisherSales = {};
  data.forEach(game => {
    publisherSales[game.Publisher] = (publisherSales[game.Publisher] || 0) + game.Global_Sales;
  });
  
  const topPublishers = sortObjectByValues(publisherSales, 10);
  
  const options = getChartOptions('pie', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Top 10 Editoriales por Ventas',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.overviewPie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(topPublishers),
      datasets: [{
        data: Object.values(topPublishers),
        backgroundColor: chartColors.getColorArray(10),
        borderWidth: 2,
        borderColor: isDarkMode ? '#1F2937' : '#FFF'
      }]
    },
    options: options
  });
}

// Gráfico de Tendencia Anual
function createYearlyTrendChart(data, isDarkMode) {
  const ctx = document.getElementById('yearlyTrend').getContext('2d');
  
  const yearSales = {};
  data.forEach(game => {
    if (game.Year && game.Year !== 'N/A') {
      yearSales[game.Year] = (yearSales[game.Year] || 0) + game.Global_Sales;
    }
  });
  
  const sortedYears = Object.keys(yearSales).sort((a, b) => parseInt(a) - parseInt(b));
  
  const options = getChartOptions('line', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Tendencia de Ventas por Años',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.yearlyTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedYears,
      datasets: [{
        label: 'Ventas Globales (Millones)',
        data: sortedYears.map(year => yearSales[year]),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.withOpacity(chartColors.primary, 0.1),
        fill: true,
        tension: 0.2
      }]
    },
    options: options
  });
}

// Gráfico de Barras por Plataforma
function createPlatformBarChart(data, isDarkMode) {
  const ctx = document.getElementById('platformBar').getContext('2d');
  
  const platformSales = {};
  data.forEach(game => {
    platformSales[game.Platform] = (platformSales[game.Platform] || 0) + game.Global_Sales;
  });
  
  const topPlatforms = sortObjectByValues(platformSales);
  
  const options = getChartOptions('bar', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Ventas por Plataforma',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.platformBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(topPlatforms),
      datasets: [{
        label: 'Ventas (Millones)',
        data: Object.values(topPlatforms),
        backgroundColor: chartColors.secondary,
        borderWidth: 2,
        borderColor: chartColors.primary,
        borderRadius: 4
      }]
    },
    options: options
  });
}

// Gráfico de Dona por Plataforma
function createPlatformDoughnutChart(data, isDarkMode) {
  const ctx = document.getElementById('platformDoughnut').getContext('2d');
  
  const platformSales = {};
  data.forEach(game => {
    platformSales[game.Platform] = (platformSales[game.Platform] || 0) + game.Global_Sales;
  });
  
  const topPlatforms = sortObjectByValues(platformSales, 8);
  
  const options = getChartOptions('doughnut', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Cuota de Mercado por Plataforma',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  options.cutout = '60%';
  
  chartInstances.platformDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(topPlatforms),
      datasets: [{
        data: Object.values(topPlatforms),
        backgroundColor: chartColors.getColorArray(8),
        borderWidth: 2,
        borderColor: isDarkMode ? '#1F2937' : '#FFF'
      }]
    },
    options: options
  });
}

// Gráfico de Radar por Género
function createGenreRadarChart(data, isDarkMode) {
  const ctx = document.getElementById('genreRadar').getContext('2d');
  
  const genreSales = {};
  data.forEach(game => {
    genreSales[game.Genre] = (genreSales[game.Genre] || 0) + game.Global_Sales;
  });
  
  const options = getChartOptions('radar', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Distribución de Ventas por Género',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.genreRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: Object.keys(genreSales),
      datasets: [{
        label: 'Ventas (Millones)',
        data: Object.values(genreSales),
        backgroundColor: chartColors.withOpacity(chartColors.primary, 0.2),
        borderColor: chartColors.primary,
        pointBackgroundColor: chartColors.primary,
        pointHoverBackgroundColor: '#fff',
        pointBorderColor: '#fff',
        pointHoverBorderColor: chartColors.primary
      }]
    },
    options: options
  });
}

// Gráfico Circular por Género
function createGenrePieChart(data, isDarkMode) {
  const ctx = document.getElementById('genrePie').getContext('2d');
  
  const genreSales = {};
  data.forEach(game => {
    genreSales[game.Genre] = (genreSales[game.Genre] || 0) + game.Global_Sales;
  });
  
  const options = getChartOptions('pie', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Cuota de Mercado por Género',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.genrePie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(genreSales),
      datasets: [{
        data: Object.values(genreSales),
        backgroundColor: chartColors.getColorArray(Object.keys(genreSales).length),
        borderWidth: 2,
        borderColor: isDarkMode ? '#1F2937' : '#FFF'
      }]
    },
    options: options
  });
}

// Gráfico de Comparación Regional
function createRegionComparisonChart(data, isDarkMode) {
  const ctx = document.getElementById('regionComparison').getContext('2d');
  
  const genreSales = {};
  
  data.forEach(game => {
    if (!genreSales[game.Genre]) {
      genreSales[game.Genre] = {
        na: 0,
        eu: 0,
        jp: 0,
        other: 0,
        total: 0
      };
    }
    
    genreSales[game.Genre].na += game.NA_Sales;
    genreSales[game.Genre].eu += game.EU_Sales;
    genreSales[game.Genre].jp += game.JP_Sales;
    genreSales[game.Genre].other += game.Other_Sales;
    genreSales[game.Genre].total += game.Global_Sales;
  });
  
  const topGenres = Object.entries(genreSales)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([genre]) => genre);
  
  const options = getChartOptions('bar', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Ventas Regionales por Géneros Principales',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  options.plugins.legend = {
    display: true,
    position: 'top'
  };
  
  chartInstances.regionComparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topGenres,
      datasets: [
        {
          label: 'Norteamérica',
          data: topGenres.map(genre => genreSales[genre].na),
          backgroundColor: chartColors.primary,
          borderWidth: 2,
          borderColor: chartColors.primary,
          borderRadius: 4
        },
        {
          label: 'Europa',
          data: topGenres.map(genre => genreSales[genre].eu),
          backgroundColor: chartColors.secondary,
          borderWidth: 2,
          borderColor: chartColors.secondary,
          borderRadius: 4
        },
        {
          label: 'Japón',
          data: topGenres.map(genre => genreSales[genre].jp),
          backgroundColor: chartColors.accent,
          borderWidth: 2,
          borderColor: chartColors.accent,
          borderRadius: 4
        },
        {
          label: 'Otras Regiones',
          data: topGenres.map(genre => genreSales[genre].other),
          backgroundColor: chartColors.purple,
          borderWidth: 2,
          borderColor: chartColors.purple,
          borderRadius: 4
        }
      ]
    },
    options: options
  });
}

// Gráfico de Área Polar por Género
function createGenrePolarAreaChart(data, isDarkMode) {
  const ctx = document.getElementById('genrePolarArea').getContext('2d');
  
  const genreSales = {};
  data.forEach(game => {
    genreSales[game.Genre] = (genreSales[game.Genre] || 0) + game.Global_Sales;
  });
  
  const options = getChartOptions('polarArea', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Distribución de Ventas por Género',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  
  chartInstances.genrePolarArea = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: Object.keys(genreSales),
      datasets: [{
        data: Object.values(genreSales),
        backgroundColor: chartColors.getColorArray(Object.keys(genreSales).length),
        borderWidth: 2,
        borderColor: isDarkMode ? '#1F2937' : '#FFF'
      }]
    },
    options: options
  });
}

// Gráfico de Barras Horizontales por Editorial
function createPublisherHorizontalBarChart(data, isDarkMode) {
  const ctx = document.getElementById('publisherHorizontalBar').getContext('2d');
  
  const publisherSales = {};
  data.forEach(game => {
    publisherSales[game.Publisher] = (publisherSales[game.Publisher] || 0) + game.Global_Sales;
  });
  
  const topPublishers = sortObjectByValues(publisherSales, 15);
  
  const options = getChartOptions('horizontalBar', isDarkMode);
  options.plugins.title = {
    display: true,
    text: 'Top 15 Editoriales por Ventas',
    color: isDarkMode ? '#F3F4F6' : '#333',
    font: {
      family: "'Press Start 2P', cursive",
      size: 14,
      weight: 'bold'
    }
  };
  options.indexAxis = 'y';
  
  chartInstances.publisherHorizontalBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(topPublishers),
      datasets: [{
        label: 'Ventas (Millones)',
        data: Object.values(topPublishers),
        backgroundColor: chartColors.withOpacity(chartColors.accent, 0.8),
        borderWidth: 2,
        borderColor: chartColors.accent,
        borderRadius: 4
      }]
    },
    options: options
  });
}