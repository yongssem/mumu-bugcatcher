// 실시간 setTimeout 대신 게임 시간에 종속: 일시정지·종료 후 재생성 금지.
export class GameTimers {
  jobs = []
  after(seconds, run) { this.jobs.push({ seconds, run }) }
  update(dt) {
    const due = []
    this.jobs = this.jobs.filter(job => { job.seconds -= dt; if (job.seconds <= 0) { due.push(job); return false } return true })
    for (const job of due) job.run()
  }
  clear() { this.jobs.length = 0 }
}
