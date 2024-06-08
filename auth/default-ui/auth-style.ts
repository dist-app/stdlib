export const authStyle = `
html, body {
  height: 100%;
  margin: 0;
}
body {
  background-image: linear-gradient(145deg, #3e4b66 0%, #1f2533 100%);
  background-attachment: fixed;
  color: #fff;
  font-family: Roboto, sans;
  display: flex;
  flex-direction: column;
}
body > * {
  flex-shrink: 0;
}
header {
  text-align: center;
  margin: 5em 1em 3em;
}
header h1 {
  font-size: 4em;
  margin: 0;
  font-weight: 500;
}
header h2 {
  font-size: 2em;
  margin: 0;
  color: #aaa;
  font-weight: 300;
}
header em {
  font-weight: 400;
  font-style: normal;
}
a {
  color: #ccc;
}
nav {
  display: flex;
  justify-content: center;
}
.fill {
  flex: 1;
}
.action {
  display: block;
  border: 3px solid #ccc;
  margin: 1em;
  padding: 0.7em 2em;
  text-decoration: none;
}
.alt-action {
  border-color: #999;
}
.action:hover {
  border-color: #fff;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.15);
  text-decoration: underline;
}
footer {
  max-width: 40em;
  margin: 5em auto 3em;
  text-align: center;
  color: #999;
}

.modal-form a {
  color: #333;
}
.modal-form .action {
  border-color: #666;
}
.modal-form .action:hover {
  border-color: #000;
  color: #000;
  background-color: rgba(0, 0, 0, 0.15);
}

.modal-form-tabstrip {
  margin: -4.5em 0 2em 1em;
  padding: 0;
  list-style: none;
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
}
.modal-form-tabstrip a {
  height: 2.5em;
  line-height: 3em;
  box-sizing: border-box;
  display: block;
  padding: 0 1em;
  background-color: #ccc;
}
.modal-form-tabstrip a.active {
  text-decoration: none;
  background-color: #eee;
}
.modal-form-tabstrip a:hover, .modal-form-tabstrip a:focus {
  background-color: #e3e3e3;
}

.modal-form {
  display: flex;
  flex-direction: column;
  background-color: #eee;
  text-align: center;
  color: #000;
  margin: 5em auto 3em;
  padding: 2em 0;
  width: 100%;
}
@media screen and (min-width: 35em) {
  .modal-form {
    padding: 2em 1em;
    width: 35em;
  }
}
.modal-form.compact {
  margin: 1em auto;
  padding: 1em 1em;
}
.modal-form hr {
  width: 75%;
  margin: 1.5em auto 1em;
  background-color: #333;
}
.modal-form input, .modal-form select, .modal-form button {
  font-size: 1.3em;
  margin: 0.25em 1em;
  padding: 0.5em 1em;
  display: block;
  border: 3px solid #ccc;
}
.modal-form input:focus, .modal-form select:focus, .modal-form button:focus {
  border-color: #666;
  box-shadow: 0 0 4px 1px rgba(50, 50, 50, 0.3);
  outline: none;
}
.modal-form input:hover, .modal-form select:hover, .modal-form button:hover {
  border-color: #999;
  outline: none;
}
.modal-form input {
  background-color: #fff;
}
.modal-form select {
  background-color: #fff;
}
.modal-form button {
  background-color: rgba(0, 0, 0, 0.15);
  cursor: 666;
  color: #333;
}
.modal-form p, .modal-form h1, .modal-form h2 {
  margin: 0.2em 1em 0.5em;
  font-weight: 300;
  color: #000;
}
.modal-form input {
  letter-spacing: 1px;
}
.modal-form input[type=password]:not(:placeholder-shown) {
  letter-spacing: 4px;
}
.modal-form input[disabled] {
  background-color: #f3f3f3;
}
.modal-form h1 em {
  font-weight: 400;
  font-style: normal;
}
.modal-form .row {
  display: flex;
}
.modal-form .row label {
  align-self: center;
  color: #000;
  font-size: 1.2em;
  margin-right: 2em;
  letter-spacing: 1px;
}
.modal-form .hint {
  margin-top: 0;
}
`;
