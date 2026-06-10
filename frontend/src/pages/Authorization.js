import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import AxiosAPI from '../components/AxiosAPI';
export const Authorization = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const handleLogin = async () => {
        setError(null);
        if (!login || !password) {
            setError("Заполните все поля");
            return;
        }
        try {
            setLoading(true);
            const response = await AxiosAPI.post("/auth/login/", {
                username: login,
                password: password,
            });
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("username", response.data.username);
            navigate("/");
        } catch (e) {
            if (e.response?.status === 400) {
                setError("Неверный логин или пароль");
            } else {
                setError("Ошибка сервера");
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="auth-container">
            <div className='card card-auth'>
                <div className='header-auth'>
                    <div className="text-title">Авторизация</div>
                    {error && <div className="error-text">{error}</div>}
                </div>
                <div className="form-field">
                    <div className="second-text">Логин</div>
                    <input className="form-input" placeholder="Введите логин" value={login} 
                        onChange={e => setLogin(e.target.value)}/>
                </div>
                <div className="form-field">
                    <div className="second-text">Пароль</div>
                    <input className="form-input" type="password" placeholder="Введите пароль" 
                        value={password} onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}/>
                </div>
                <div className='flex-row'>
                    <button className="btn-primary" onClick={handleLogin} disabled={loading}>
                        {loading ? "Загрузка..." : "Войти"}
                    </button>
                </div>
                <div className='flex-row'>
                    <a className='second-text' href='#' onClick={(e) => {e.preventDefault(); navigate("/registration")}}>Зарегистрироваться</a>    
                </div>
            </div>
        </div>
    );
};