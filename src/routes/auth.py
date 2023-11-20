import logging

from flask import (Blueprint, Response, abort, redirect, render_template,
                   request)

import auth
import db
import jsonw
from auth import AuthError, RequestTokenError

log = logging.getLogger('app.routes.auth')
bp = Blueprint('auth', __name__, url_prefix='/auth')


def handle_auth_error(err: AuthError):
    """
    Display permission denied error page with reason, or redirect to login page
    """
    if err.redirect:
        return redirect('/auth/login')

    return Response(render_template('403.jinja2', reason=err.reason.message), 403)


def handle_token_error(_err: RequestTokenError):
    """
    Return bad request
    """
    log.warning('Invalid CSRF token')
    return abort(400, 'Invalid CSRF token')


@bp.route('/login', methods=['GET', 'POST'])
def route_login():
    """
    Login route. Serve login page for GET requests, and accepts password input for POST requests.
    If the provided password is invalid, the login template is rendered with invalid_password=True
    """
    with db.connect() as conn:
        try:
            auth.verify_auth_cookie(conn)
            # User is already logged in
            return redirect('/')
        except AuthError:
            pass

        if request.method == 'GET':
            return render_template('login.jinja2', invalid_password=False)

        if request.is_json:
            username = request.json['username']
            password = request.json['password']
        else:
            username = request.form['username']
            password = request.form['password']

        token = auth.log_in(conn, username, password)

        if token is None:
            if request.is_json:
                return Response(None, 403)
            else:
                return render_template('login.jinja2', invalid_password=True)

        if request.is_json:
            return {'token': token}

        response = redirect('/')
        response.set_cookie('token', token, max_age=3600*24*30, samesite='Strict')
        return response


@bp.route('/get_csrf')
def route_get_csrf():
    """
    Get CSRF token
    """
    with db.connect() as conn:
        user = auth.verify_auth_cookie(conn)
        csrf_token = user.get_csrf()
    response = jsonw.json_response({'token': csrf_token})
    response.cache_control.max_age = 600
    response.cache_control.private = True
    return response
