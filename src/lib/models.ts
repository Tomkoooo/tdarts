import {BoardSchema, MatchSchema, PlayerSchema, QrTokenSchema, TournamentSchema, PlayerTournamentHistorySchema, ClubSchema}  from '@/types/index'
import mongoose from 'mongoose'

export function getModels() {
    return {
      TournamentModel: mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema),
      PlayerModel: mongoose.models.Player || mongoose.model('Player', PlayerSchema),
      PlayerTournamentHistoryModel: mongoose.models.PlayerTournamentHistory || mongoose.model('PlayerTournamentHistory', PlayerTournamentHistorySchema),
      MatchModel: mongoose.models.Match || mongoose.model('Match', MatchSchema),
      BoardModel: mongoose.models.Board || mongoose.model('Board', BoardSchema),
      ClubModel: mongoose.models.Club || mongoose.model('Club', ClubSchema),
      QrTokenModel: mongoose.models.QrToken || mongoose.model('QrToken', QrTokenSchema),
    };
  }