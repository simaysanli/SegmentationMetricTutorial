import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatSliderModule } from '@angular/material/slider';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {MatIconModule} from '@angular/material/icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import { ConfMatComponent } from './Components/conf-mat/conf-mat.component';
import { MetricsComponent } from './Components/metrics/metrics.component';
import { ClassesService } from './Services/classes.service';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';
import { PresetsComponent } from './Components/presets/presets.component';
import { WelcomeComponent } from './Components/welcome/welcome.component';
import { MainPageComponent } from './Components/main-page/main-page.component';
//import { MathjaxModule } from 'mathjax-angular';
import {MatCardModule} from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { SurgicalPhaseComponent } from './Components/Classification/surgical-phase/surgical-phase.component';
import { ClassificationPageComponent } from './Components/Classification/classification-page/classification-page.component';
import {MatInputModule} from '@angular/material/input';
import { FormsModule } from '@angular/forms';
//import { MatFileUploadModule } from 'angular-material-fileupload';
import { ArrayComponent } from './Components/Classification/array/array.component';

@NgModule({
  declarations: [
    AppComponent,
    ConfMatComponent,
    MetricsComponent,
    PresetsComponent,
    WelcomeComponent,
    MainPageComponent,
    SurgicalPhaseComponent,
    ClassificationPageComponent,
    ArrayComponent
  ],
  imports: [
    //MatFileUploadModule,
    FormsModule,
    MatInputModule,
    MatProgressSpinnerModule,
    //MathjaxModule.forRoot(),
    MatIconModule,
    MatButtonToggleModule,
    MatListModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatDividerModule,
    MatSidenavModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatSliderModule,
    MatButtonModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  providers: [ClassesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
