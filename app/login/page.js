export default function Login({ searchParams }) {
  return (
    <main className="login">
      <div className="carte">
        <h1>Synchro statuts Drest</h1>
        <p className="doux">Mise à jour automatique des statuts de commande selon les transporteurs.</p>
        <form method="post" action="/api/login">
          <label>Mot de passe<input type="password" name="mot_de_passe" autoFocus required /></label>
          {searchParams?.erreur && <p className="ko">Mot de passe incorrect.</p>}
          <button className="principal" type="submit">Entrer</button>
        </form>
      </div>
    </main>
  );
}
