import {BoardSchema, MatchSchema, PlayerSchema, QrTokenSchema, TournamentSchema, PlayerTournamentHistorySchema, ClubSchema}  from '@/types/index'
import mongoose from 'mongoose'

export function getModels() {
  throw new Error('Deprecated: Import models directly from their files.');
}