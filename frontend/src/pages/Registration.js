
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import AxiosAPI from '../components/AxiosAPI'

export const Registration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const handleRegister = async () => {
        setError(null);
        if (!login || !password || !passwordConfirm) {
            setError("Заполните все поля");
            return;
        }
        if (password !== passwordConfirm) {
            setError("Пароли не совпадают");
            return;
        }
        if (password.length < 8) {
            setError("Пароль должен быть не менее 8 символов");
            return;
        }
        try {
            setLoading(true);
            const response = await AxiosAPI.post("/auth/registration/", { username: login, password: password });
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("username", response.data.username);
            navigate("/");
        } catch (e) {
            const data = e.response?.data;
            if (data?.username) setError(`Логин: ${data.username[0]}`);
            else if (data?.password) setError(`Пароль: ${data.password[0]}`);
            else setError("Ошибка регистрации");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="auth-container">
            <div className='card card-auth'>
                <div className='header-auth'>
                    <div className="text-title">Регистрация</div>
                    {error && <div className="error-text">{error}</div>}
                </div>
                <div className="form-field">
                    <div className="second-text">Логин</div>
                    <input className="form-input" placeholder="Введите логин" value={login} onChange={e => setLogin(e.target.value)}/>
                </div>
                <div className="form-field">
                    <div className="second-text">Пароль</div>
                    <input className="form-input" type="password" placeholder="Введите пароль" value={password} onChange={e => setPassword(e.target.value)}/>
                </div>
                <div className="form-field">
                    <div className="second-text">Подтверждение пароля</div>
                    <input className="form-input" type="password" placeholder="Подтвердите пароль" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}/>
                </div>
                <div className='flex-row'>
                    <button className="btn-primary" onClick={handleRegister} disabled={loading}>
                        {loading ? "Загрузка..." : "Регистрация"}
                    </button>
                </div>
            </div>
        </div>
    );
};