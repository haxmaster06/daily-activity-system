<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
 * Channel notifikasi pribadi.
 *
 * Namanya ditentukan Laravel dari kelas notifiable. Hanya pemiliknya sendiri
 * yang boleh mendengarkan — lonceng orang lain bukan urusan siapa pun.
 */
Broadcast::channel('App.Models.User.{id}', function (User $user, string $id) {
    return (int) $user->getKey() === (int) $id;
});
