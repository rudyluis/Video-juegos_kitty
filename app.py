from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlalchemy.orm import sessionmaker
from models.base import engine
from models.model import Usuario, VideoGameSale
from werkzeug.security import generate_password_hash, check_password_hash
import os
from flask import jsonify
app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Crear sesión SQLAlchemy
Session = sessionmaker(bind=engine)
db_session = Session()

# Setup de LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

@login_manager.user_loader
def load_user(user_id):
    return db_session.query(Usuario).get(int(user_id))

# Ruta principal
@app.route('/')
def home():
    return render_template('auth.html')


@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form['action']
        username = request.form['username']
        password = request.form['password']
        if action == 'register':
            if db_session.query(Usuario).filter(username == username).first():
                flash('El usuario ya existe','danger')
            else:
                new_user = Usuario(
                    username=username, 
                    password=generate_password_hash(password)
                )
                db_session.add(new_user)
                db_session.commit()
                flash('Usuario creado exitosamente','success')  
                return redirect(url_for('auth'))
        elif action == 'login':
            user = db_session.query(Usuario).filter(username == username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                flash('Sesión iniciada exitosamente','success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuario o contraseña incorrectos','danger')
                return redirect(url_for('auth'))
    return render_template('auth.html')  # Renderizamos el formulario

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username= current_user.username)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth'))

#### Creacion y llamada ala BD
@app.route('/api/videogames')
def api_videogames():
    print("API LLEGAMOS")
    videogames = db_session.query(VideoGameSale).all()
    ##print(videogames)
    juegos=[]
    for juego in videogames:
        juegos.append({
            "Name":juego.name,
            "Platform":juego.platform,
            "Year":juego.year,
            "Genre":juego.genre,
            "Publisher":juego.publisher,
            "NA_Sales":juego.na_sales,
            "EU_Sales":juego.eu_sales,
            "JP_Sales":juego.jp_sales,
            "Other_Sales":juego.other_sales,
            "Global_Sales":juego.global_sales
        })
    ##print(juegos)
    return jsonify(juegos)
@app.route('/api/filtros', methods=['GET'])
def obtener_filtros():
    plataforma = request.args.getlist('plataforma')
    genero = request.args.getlist('genero')
    anio = request.args.getlist('anio')
    editor = request.args.getlist('editor')

    query = db_session.query(VideoGameSale)
    print(plataforma)
    if plataforma:
        query = query.filter(VideoGameSale.platform.in_(plataforma))
    if genero:
        query = query.filter(VideoGameSale.genre.in_(genero))
    if anio:
        query = query.filter(VideoGameSale.year.in_(anio))
    if editor:
        query = query.filter(VideoGameSale.publisher.in_(editor))

    data = query.all()

    plataformas = sorted({v.platform for v in data if v.platform})
    print(plataformas)
    generos = sorted({v.genre for v in data if v.genre})
    print(generos)
    anios = sorted({v.year for v in data if v.year})
    print(anios)
    editores = sorted({v.publisher for v in data if v.publisher})
    print(editores)
    return jsonify({
        'plataformas': plataformas,
        'generos': generos,
        'anios': anios,
        'editores': editores
    })

@app.route('/listgames')
@login_required
def listgames():
    return render_template('crud/list.html')

###### CRUD

@app.route('/api/list_videogames')
def api_list_videogames():
    data = db_session.query(VideoGameSale).all()
    
    juegos = []
    for juego in data:
        
        juegos.append({
            "id": juego.id,
            "Name": juego.name,
            "Platform": juego.platform,
            "Year": juego.year,
            "Genre": juego.genre,
            "Publisher": juego.publisher,
            "NA_Sales": juego.na_sales,
            "EU_Sales": juego.eu_sales,
            "JP_Sales": juego.jp_sales,
            "Other_Sales": juego.other_sales,
            "Global_Sales": juego.global_sales
        })

    return jsonify(juegos)

##para los combos de filtros
@app.route('/api/opciones', methods=['GET'])
def obtener_opciones():
    plataformas = db_session.query(VideoGameSale.platform).distinct().all()
    generos = db_session.query(VideoGameSale.genre).distinct().all()
    editores = db_session.query(VideoGameSale.publisher).distinct().all()
    anios = db_session.query(VideoGameSale.year).distinct().all()

    return jsonify({
        "plataformas": sorted([p[0] for p in plataformas if p[0]]),
        "generos": sorted([g[0] for g in generos if g[0]]),
        "editores": sorted([e[0] for e in editores if e[0]]),
        "anios": sorted([a[0] for a in anios if a[0]])
    })

#### Agregar Videojuego
@app.route('/add/videogames', methods=['POST'])
def crear_videojuego():
    data = request.json
    nuevo = VideoGameSale(
        rank=int(data.get('rank')),
        name=data.get('name'),
        platform=data.get('platform'),
        year=int(data.get('year')) if data.get('year') else None,
        genre=data.get('genre'),
        publisher=data.get('publisher'),
        na_sales=float(data.get('na_sales')),
        eu_sales=float(data.get('eu_sales')),
        jp_sales=float(data.get('jp_sales')),
        other_sales=float(data.get('other_sales')),
        global_sales=float(data.get('global_sales'))
    )
    db_session.add(nuevo)
    db_session.commit()
    return jsonify({"mensaje": "Videojuego agregado correctamente"})

@app.route('/del/videogames/<int:id>', methods=['DELETE'])
def eliminar_videojuego(id):
    videojuego = db_session.query(VideoGameSale).get(id)
    if videojuego:
        db_session.delete(videojuego)
        db_session.commit()
        return jsonify({"mensaje": "Eliminado correctamente"})
    return jsonify({"error": "Videojuego no encontrado"}), 404


@app.route('/upd/videogames/<int:id>', methods=['PUT'])
def actualizar_videojuego(id):
    data = request.json
    juego = db_session.query(VideoGameSale).get(id)
    if not juego:
        return jsonify({"error": "No encontrado"}), 404

    juego.rank = int(data.get("rank"))
    juego.name = data.get("name")
    juego.platform = data.get("platform")
    juego.year = int(data.get("year")) if data.get("year") else None
    juego.genre = data.get("genre")
    juego.publisher = data.get("publisher")
    juego.na_sales = float(data.get("na_sales"))
    juego.eu_sales = float(data.get("eu_sales"))
    juego.jp_sales = float(data.get("jp_sales"))
    juego.other_sales = float(data.get("other_sales"))
    juego.global_sales = float(data.get("global_sales"))

    db_session.commit()
    return jsonify({"mensaje": "Actualizado correctamente"})




if __name__ == '__main__':
    app.run(debug=True)