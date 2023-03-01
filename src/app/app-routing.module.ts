import {NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArrayComponent } from './Components/Classification/array/array.component';
import { ClassificationPageComponent } from './Components/Classification/classification-page/classification-page.component';
import { SurgicalPhaseComponent } from './Components/Classification/surgical-phase/surgical-phase.component';
import { MainPageComponent } from './Components/main-page/main-page.component';


const routes: Routes = [
  { path: '', redirectTo: 'main/classification', pathMatch:'full'},
  //{path:'welcome', component:WelcomeComponent},
  {path:'main', component:MainPageComponent, children:[
    {path:'classification', component:ClassificationPageComponent, children:[
      {path:'surgical-phase', component:SurgicalPhaseComponent},
      {path:'array', component:ArrayComponent},
      {path:'**', component:ArrayComponent}
    ]},
  ]},
  {path:'surgical-phase', component:SurgicalPhaseComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
