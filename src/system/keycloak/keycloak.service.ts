import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'

@Injectable()
export class KeycloakService {
  private readonly keycloakHost = process.env.KEYCLOAK_URL
  private readonly keycloakClient = process.env.KEYCLOAK_CLIENT
  private readonly keycloakUser = process.env.KEYCLOAK_USER
  private readonly keycloakPwd = process.env.KEYCLOAK_PWD
  private readonly realms = process.env.KEYCLOAK_REALMS || 'cym'

  constructor(private readonly httpService: HttpService) {}

  async getToken(): Promise<string> {
    const url = `${this.keycloakHost}realms/${this.realms}/protocol/openid-connect/token`

    const data = new URLSearchParams({
      grant_type: 'password',
      client_id: this.keycloakClient,
      username: this.keycloakUser,
      password: this.keycloakPwd
    }).toString()

    const response = await this.httpService
      .post(url, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      .toPromise()

    return response.data.access_token
  }

  async getUsersInGroup(groupId: string): Promise<any[]> {
    const token = await this.getToken()
    const url = `${this.keycloakHost}admin/realms/${this.realms}/groups/${groupId}/members`

    const response = await this.httpService
      .get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .toPromise()

    return response.data
  }

  async getSubGroupsByGroupsName(groupNames: string[]): Promise<any[]> {
    const token = await this.getToken()
    console.log(
      '🐸 Pepe said >> KeycloakService >> getSubGroupsByGroupsName >> token:',
      token
    )

    const url = `${this.keycloakHost}admin/realms/${this.realms}/groups`

    const response = await this.httpService
      .get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .toPromise()

    const groups = response.data
    const subGroups = []

    for (const group of groups) {
      if (!groupNames.includes(group.name)) {
        continue
      }

      if (!group.subGroups || !group.subGroups.length) {
        continue
      }

      for (const subGroup of group.subGroups) {
        subGroups.push(subGroup)
      }
    }

    return subGroups
  }
}
