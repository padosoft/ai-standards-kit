CREATE DATABASE IF NOT EXISTS ai_orch
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE ai_orch;

CREATE TABLE IF NOT EXISTS runs (
  run_id        VARCHAR(40)  NOT NULL,
  created_at    DATETIME(6)  NOT NULL,
  updated_at    DATETIME(6)  NOT NULL,
  status        ENUM('pending','running','done','failed') NOT NULL,
  task          MEDIUMTEXT   NOT NULL,
  mode          ENUM('safe','fast') NOT NULL,
  constraints_json JSON NULL,
  PRIMARY KEY (run_id),
  INDEX idx_runs_status_updated (status, updated_at),
  INDEX idx_runs_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS steps (
  run_id        VARCHAR(40) NOT NULL,
  step_id       INT         NOT NULL,
  agent         VARCHAR(40) NOT NULL,
  goal          TEXT        NOT NULL,
  contract_json JSON        NOT NULL,
  status        ENUM('pending','accepted','rejected') NOT NULL,
  output_json   JSON        NULL,
  created_at    DATETIME(6) NOT NULL,
  updated_at    DATETIME(6) NOT NULL,
  PRIMARY KEY (run_id, step_id),
  INDEX idx_steps_run_status (run_id, status),
  INDEX idx_steps_agent_status (agent, status),
  CONSTRAINT fk_steps_run
    FOREIGN KEY (run_id) REFERENCES runs(run_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS artifacts (
  run_id        VARCHAR(40) NOT NULL,
  step_id       INT         NOT NULL,
  name          VARCHAR(255) NOT NULL,
  path          TEXT        NOT NULL,
  content_type  VARCHAR(100) NOT NULL,
  size_bytes    BIGINT      NOT NULL,
  sha256        CHAR(64)    NOT NULL,
  created_at    DATETIME(6) NOT NULL,
  PRIMARY KEY (run_id, step_id, name),
  INDEX idx_artifacts_run (run_id),
  CONSTRAINT fk_artifacts_step
    FOREIGN KEY (run_id, step_id) REFERENCES steps(run_id, step_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
