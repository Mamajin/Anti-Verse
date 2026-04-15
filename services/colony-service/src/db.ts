import knex from 'knex';
import knexConfig from '../knexfile';
import { config } from './config';

const environment = config.NODE_ENV === 'test' ? 'development' : config.NODE_ENV;

export const db = knex(knexConfig[environment]);
