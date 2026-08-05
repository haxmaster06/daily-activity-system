<?php

use App\Models\User;
use App\Support\IzinChannel;
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

/*
 * Channel perubahan data per departemen.
 *
 * ⚠️ Penjagaan yang sama dengan yang dipakai Executive Analytics, dan harus
 * tetap sama: yang boleh mendengarkan hanya yang jangkauan datanya mencakup
 * departemen itu. Tanpa pemeriksaan ini, siapa pun yang sudah masuk dapat
 * mengetahui departemen mana yang sedang mengirim laporan — muatannya memang
 * tipis, tetapi polanya sendiri sudah bercerita.
 */
Broadcast::channel(
    'departemen.{departemenId}',
    fn (User $user, string $departemenId) => IzinChannel::departemen($user, (int) $departemenId),
);
